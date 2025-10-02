import {
  type AttributeValue,
  ConditionalCheckFailedException,
  DeleteItemCommand,
  type DeleteItemCommandOutput,
  DynamoDBClient,
  GetItemCommand,
  type GetItemCommandOutput,
  PutItemCommand,
  type PutItemCommandOutput,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  LTIClient,
  LTIDeployment,
  LTILaunchConfig,
  LTISession,
  LTIStorage,
} from '@lti-tool/core';
import type { Logger } from 'pino';

import {
  LAUNCH_CONFIG_CACHE,
  SESSION_CACHE,
  SESSION_TTL,
  undefinedLaunchConfigValue,
  undefinedSessionValue,
} from './cacheConfig.js';
import type { DynamoBase } from './interfaces/dynamoBase.js';
import type { DynamoDbStorageConfig } from './interfaces/dynamoDbStorageConfig.js';
import type { DynamoLTIClient } from './interfaces/dynamoLTIClient.js';
import type { DynamoLTIDeployment } from './interfaces/dynamoLTIDeployment.js';

/**
 * DynamoDB implementation of LTI storage interface.
 *
 * Stores platforms, sessions, and nonces in DynamoDB with LRU caching.
 * Uses single-table design with different prefixes for different entity types.
 */
export class DynamoDbStorage implements LTIStorage {
  private logger: Logger;
  private controlPlaneTable: string;
  private dataPlaneTable: string;
  private launchConfigTable: string;
  private ddbClient: DynamoDBClient;
  private nonceExpirationSeconds: number;

  /**
   * Creates a new DynamoDB storage instance.
   *
   * @param config - Configuration including table names and optional logger
   */
  constructor(config: DynamoDbStorageConfig) {
    this.logger =
      config?.logger ??
      ({
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      } as unknown as Logger);
    this.controlPlaneTable = config.controlPlaneTable;
    this.dataPlaneTable = config.dataPlaneTable;
    this.launchConfigTable = config.launchConfigTable;
    this.nonceExpirationSeconds = config.nonceExpirationSeconds ?? 600;
    this.ddbClient = new DynamoDBClient();
  }

  async listClients(): Promise<Omit<LTIClient, 'deployments'>[]> {
    this.logger.debug('listing all clients');

    const clients: Omit<LTIClient, 'deployments'>[] = [];
    let lastEvaluatedKey: Record<string, AttributeValue> | undefined;

    do {
      const result = await this.ddbClient.send(
        new QueryCommand({
          TableName: this.controlPlaneTable,
          IndexName: 'GSI1',
          KeyConditionExpression: 'gsi1pk = :gsi1pk',
          ExpressionAttributeValues: marshall({
            ':gsi1pk': 'Type#Client',
          }),
          ExclusiveStartKey: lastEvaluatedKey,
          ReturnConsumedCapacity: 'TOTAL',
        }),
      );
      this.validateDynamoDbResult(result, 'scan clients');

      if (result.Items?.length) {
        for (const item of result.Items) {
          const clientRecord = unmarshall(item) as DynamoLTIClient;
          clients.push(clientRecord);
        }
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    this.logger.debug({ count: clients.length }, 'clients found');
    return clients;
  }

  async getClientById(clientId: string): Promise<LTIClient | undefined> {
    this.logger.debug({ clientId }, 'getting client by id');

    // query all items for this client -- it's uuid
    const pk = this.createClientPK(clientId);
    const result = await this.ddbClient.send(
      new QueryCommand({
        TableName: this.controlPlaneTable,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': pk, // "C#uuid-goes-here"
        }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'get client');

    if (!result.Items?.length) {
      this.logger.warn({ clientId }, 'client not found');
      return undefined;
    }

    const client = this.buildClientFromDynamoItems(clientId, result.Items);
    if (!client) {
      this.logger.warn({ clientId }, 'client data not found');
      return undefined;
    }

    return client;
  }

  async addClient(client: Omit<LTIClient, 'id'>): Promise<string> {
    const clientId = crypto.randomUUID();
    const pk = this.createClientPK(clientId);
    this.logger.info({ client, clientId }, 'adding client');

    // Filter out deployments from client data
    const { deployments: _clientDeployments, ...clientWithoutDeployments } = client;

    const clientData: Omit<DynamoLTIClient, 'deployments'> = {
      pk,
      sk: '#',
      gsi1pk: 'Type#Client',
      gsi1sk: `#${clientId}`,
      type: 'Client',
      id: clientId,
      ...clientWithoutDeployments,
    };
    const result = await this.ddbClient.send(
      new PutItemCommand({
        TableName: this.controlPlaneTable,
        Item: marshall(clientData, { removeUndefinedValues: true }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'save client');

    return clientId;
  }

  async updateClient(
    clientId: string,
    client: Partial<Omit<LTIClient, 'id'>>,
  ): Promise<void> {
    this.logger.info({ clientId, client }, 'updating client');

    // Get existing platform to validate it exists
    const existing = await this.getClientById(clientId);
    if (!existing) throw new Error('Client not found');

    // check if launch config keys (PK, SK) would change
    const issuerChanged = client.iss && client.iss !== existing.iss;
    const lmsClientIdChanged = client.clientId && client.clientId !== existing.clientId;

    if (issuerChanged || lmsClientIdChanged) {
      await this.deleteAllClientLaunchConfigs(existing.iss, existing.clientId);
    }

    // Filter out deployments from client data
    const { deployments: _clientDeployments, ...clientWithoutDeployments } = client;

    // 1. Update the control plane table
    const pk = this.createClientPK(clientId);
    const updatedData = {
      pk,
      sk: '#',
      gsi1pk: 'Type#Client',
      gsi1sk: `#${clientId}`,
      type: 'Client',
      ...existing,
      ...clientWithoutDeployments, // Override with updates
      id: clientId,
    };
    const result = await this.ddbClient.send(
      new PutItemCommand({
        TableName: this.controlPlaneTable,
        Item: marshall(updatedData, { removeUndefinedValues: true }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'update client');

    // TODO - we may wish to make these paths explicit someday
    // if (issuerChanged || lmsClientIdChanged)
    // 2. Update the launch configs
    await this.updateClientLaunchConfigs(clientId);
  }

  async deleteClient(clientId: string): Promise<void> {
    this.logger.info({ clientId }, 'deleting client');

    // get client data to extract details for launch config deletion
    const existing = await this.getClientById(clientId);
    if (!existing) {
      this.logger.warn({ clientId }, 'client not found for deletion');
      return;
    }

    // 1. delete all launch configs
    this.deleteAllClientLaunchConfigs(existing.iss, existing.clientId);

    // 2. query to get all items for this client
    const pk = this.createClientPK(clientId);
    const result = await this.ddbClient.send(
      new QueryCommand({
        TableName: this.controlPlaneTable,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': pk, // "C#uuid-goes-here"
        }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'query client for deletion');

    if (!result.Items || result.Items.length === 0) {
      this.logger.warn({ clientId }, 'client not found for deletion');
      return; // Nothing to delete
    }

    // Delete all items (client data + all deployment data)
    for (const item of result.Items) {
      const deleteResult = await this.ddbClient.send(
        new DeleteItemCommand({
          TableName: this.controlPlaneTable,
          Key: marshall({
            pk: item.pk,
            sk: item.sk,
          }),
          ReturnConsumedCapacity: 'TOTAL',
        }),
      );
      this.validateDynamoDbResult(deleteResult, 'delete client');
    }

    this.logger.debug({ clientId }, 'client and all deployments deleted');
  }

  async listDeployments(clientId: string): Promise<LTIDeployment[]> {
    this.logger.debug({ clientId }, 'listing deployments for client');

    const pk = this.createClientPK(clientId);
    const result = await this.ddbClient.send(
      new QueryCommand({
        TableName: this.controlPlaneTable,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk_prefix)',
        ExpressionAttributeValues: marshall({
          ':pk': pk, // "C#uuid-goes-here"
          ':sk_prefix': 'D#',
        }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'query deployments');

    if (!result.Items?.length) {
      this.logger.debug({ clientId }, 'no deployments found');
      return [];
    }

    result.Items.map((item) => unmarshall(item) as DynamoLTIDeployment);

    const deployments: LTIDeployment[] = result.Items.map(
      (item) => unmarshall(item) as DynamoLTIDeployment,
    );

    this.logger.debug({ clientId, count: deployments.length }, 'deployments found');
    return deployments;
  }

  async getDeployment(
    clientId: string,
    deploymentId: string,
  ): Promise<LTIDeployment | undefined> {
    this.logger.debug({ clientId, deploymentId }, 'getting deployment by id');

    const pk = this.createClientPK(clientId);
    const result = await this.ddbClient.send(
      new GetItemCommand({
        TableName: this.controlPlaneTable,
        Key: marshall({
          pk, // "C#uuid-goes-here"
          sk: this.createDeploymentSK(deploymentId),
        }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'get deployment by id');

    if (!result.Item) {
      this.logger.warn({ clientId, deploymentId }, 'deployment not found');
      return undefined;
    }

    return unmarshall(result.Item) as LTIDeployment;
  }

  async addDeployment(
    clientId: string,
    deployment: Omit<LTIDeployment, 'id'>,
  ): Promise<string> {
    this.logger.info({ clientId, deployment }, 'adding deployment');
    const deploymentInternalId = crypto.randomUUID(); // generate stable id

    const pk = this.createClientPK(clientId);
    const deploymentData: DynamoLTIDeployment = {
      pk, // "C#uuid-goes-here"
      sk: this.createDeploymentSK(deploymentInternalId),
      type: 'Deployment',
      id: deploymentInternalId,
      ...deployment,
    };

    const result = await this.ddbClient.send(
      new PutItemCommand({
        TableName: this.controlPlaneTable,
        Item: marshall(deploymentData, { removeUndefinedValues: true }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'add deployment');

    // save launch config
    const launchConfig = await this.buildLtiLaunchConfig(clientId, deploymentInternalId);
    await this.saveLaunchConfig(launchConfig);

    return deploymentInternalId;
  }

  async updateDeployment(
    clientId: string,
    deploymentId: string,
    deployment: Partial<LTIDeployment>,
  ): Promise<void> {
    this.logger.info({ clientId, deploymentId, deployment }, 'updating deployment');

    // Get existing deployment to validate it exists
    const existing = await this.getDeployment(clientId, deploymentId);
    if (!existing) throw new Error('Deployment not found');

    // check if LMS deployment id changed (affects launch config SK)
    const lmsDeploymentIdChanged =
      deployment.deploymentId && deployment.deploymentId !== existing.deploymentId;

    if (lmsDeploymentIdChanged) {
      const client = await this.getClientById(clientId);
      if (client) {
        await this.deleteLaunchConfig(client.iss, client.clientId, existing.deploymentId);
      }
    }

    // Update deployment data
    const pk = this.createClientPK(clientId);
    const updatedData = {
      pk, // "C#uuid-goes-here"
      sk: this.createDeploymentSK(deploymentId),
      type: 'Deployment',
      ...existing,
      ...deployment, // Override with updates
    };
    const result = await this.ddbClient.send(
      new PutItemCommand({
        TableName: this.controlPlaneTable,
        Item: marshall(updatedData, { removeUndefinedValues: true }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'update deployment');

    // always sync launch configs
    const launchConfig = await this.buildLtiLaunchConfig(clientId, deploymentId);
    await this.saveLaunchConfig(launchConfig);
  }

  async deleteDeployment(clientId: string, deploymentId: string): Promise<void> {
    this.logger.info({ clientId, deploymentId }, 'deleting deployment');

    // get deployment and client data for launch config deletion
    const existing = await this.getDeployment(clientId, deploymentId);
    if (!existing) {
      this.logger.warn({ clientId, deploymentId }, 'deployment not found for deletion');
      return;
    }

    const client = await this.getClientById(clientId);
    if (client) {
      await this.deleteLaunchConfig(client.iss, client.clientId, existing.deploymentId);
    }

    const pk = this.createClientPK(clientId);
    const result = await this.ddbClient.send(
      new DeleteItemCommand({
        TableName: this.controlPlaneTable,
        Key: marshall({
          pk, // "C#uuid-goes-here"
          sk: this.createDeploymentSK(deploymentId),
        }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'delete deployment');

    this.logger.debug({ clientId, deploymentId }, 'deployment deleted');
  }

  // oxlint-disable-next-line no-unused-vars require-await
  async storeNonce(nonce: string, expiresAt: Date): Promise<void> {
    // Noop - the real work happens in validateNonce with conditional put
    this.logger.trace({ nonce, expiresAt }, 'nonce will be validated on use');
  }

  async validateNonce(nonce: string): Promise<boolean> {
    this.logger.debug({ nonce }, 'validating nonce');

    const expiresAt = new Date(Date.now() + this.nonceExpirationSeconds * 1000);
    const ttl = Math.floor(expiresAt.getTime() / 1000);

    try {
      const result = await this.ddbClient.send(
        new PutItemCommand({
          TableName: this.dataPlaneTable,
          Item: marshall({
            pk: this.createNonceKey(nonce),
            sk: this.createNonceKey(nonce),
            nonce,
            expiresAt: expiresAt.toISOString(),
            ttl,
          }),
          ConditionExpression: 'attribute_not_exists(pk)', // Only succeed if nonce doesn't exist
          ReturnConsumedCapacity: 'TOTAL',
        }),
      );
      this.validateDynamoDbResult(result, 'validate nonce');
      return true; // Success = nonce was valid
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        this.logger.warn({ nonce }, 'nonce already used - replay attack detected');
        return false; // Nonce already exists = replay attack
      }
      throw error; // Re-throw other errors
    }
  }

  async getSession(sessionId: string): Promise<LTISession | undefined> {
    this.logger.debug({ sessionId }, 'getting session');
    // Check cache first
    const cachedSession = SESSION_CACHE.get(sessionId);
    if (cachedSession === undefinedSessionValue) {
      return undefined;
    }
    if (cachedSession) {
      this.logger.debug({ sessionId }, 'session found in cache');
      return cachedSession;
    }
    const result = await this.ddbClient.send(
      new GetItemCommand({
        TableName: this.dataPlaneTable,
        Key: marshall({
          pk: this.createSessionKey(sessionId),
          sk: this.createSessionKey(sessionId),
        }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'get session');

    if (!result.Item) {
      this.logger.warn({ sessionId }, 'session not found');
      SESSION_CACHE.set(sessionId, undefinedSessionValue);
      return undefined;
    }

    const session = unmarshall(result.Item) as LTISession;
    SESSION_CACHE.set(sessionId, session);
    return session;
  }

  async addSession(session: LTISession): Promise<string> {
    this.logger.debug({ sessionId: session.id }, 'adding session');
    const ttl = Math.floor(Date.now() / 1000) + SESSION_TTL;

    const result = await this.ddbClient.send(
      new PutItemCommand({
        TableName: this.dataPlaneTable,
        Item: marshall(
          {
            pk: this.createSessionKey(session.id),
            sk: this.createSessionKey(session.id),
            ...session,
            ttl,
          },
          { removeUndefinedValues: true },
        ),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'add session');

    // Cache the session
    SESSION_CACHE.set(session.id, session);
    this.logger.debug({ sessionId: session.id }, 'session added');
    return session.id;
  }

  async getLaunchConfig(
    iss: string,
    clientId: string,
    deploymentId: string,
  ): Promise<LTILaunchConfig | undefined> {
    this.logger.debug({ iss, clientId, deploymentId }, 'getting launch config');

    // check cache
    const cacheKey = `${iss}#${clientId}#${deploymentId}`;
    const cachedConfig = LAUNCH_CONFIG_CACHE.get(cacheKey);
    if (cachedConfig === undefinedLaunchConfigValue) {
      // we cached a cache miss, return undefined
      return undefined;
    }
    if (cachedConfig) {
      this.logger.debug({ cachedConfig }, 'launch config found in cache');
      return cachedConfig;
    }

    const result = await this.ddbClient.send(
      new GetItemCommand({
        TableName: this.launchConfigTable,
        Key: marshall({
          pk: `${iss}#${clientId}`,
          sk: deploymentId,
        }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'get launch config');

    if (!result.Item) {
      this.logger.warn({ iss, clientId, deploymentId }, 'launch config not found');
      LAUNCH_CONFIG_CACHE.set(cacheKey, undefinedLaunchConfigValue);
      return undefined;
    }

    const launchConfig = unmarshall(result.Item) as LTILaunchConfig;
    LAUNCH_CONFIG_CACHE.set(cacheKey, launchConfig);
    return launchConfig;
  }

  async saveLaunchConfig(launchConfig: LTILaunchConfig): Promise<void> {
    this.logger.debug({ launchConfig }, 'saving launch config');

    const result = await this.ddbClient.send(
      new PutItemCommand({
        TableName: this.launchConfigTable,
        Item: marshall(
          {
            pk: `${launchConfig.iss}#${launchConfig.clientId}`,
            sk: launchConfig.deploymentId,
            ...launchConfig,
          },
          { removeUndefinedValues: true },
        ),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'save launch config');

    // Update cache
    const cacheKey = `${launchConfig.iss}#${launchConfig.clientId}#${launchConfig.deploymentId}`;
    LAUNCH_CONFIG_CACHE.set(cacheKey, launchConfig);
  }

  private async deleteLaunchConfig(
    issuer: string,
    clientId: string,
    deploymentId: string,
  ): Promise<void> {
    const result = await this.ddbClient.send(
      new DeleteItemCommand({
        TableName: this.launchConfigTable,
        Key: marshall({
          pk: `${issuer}#${clientId}`,
          sk: deploymentId,
        }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'delete launch config');

    // Clear from cache
    const cacheKey = `${issuer}#${clientId}#${deploymentId}`;
    LAUNCH_CONFIG_CACHE.delete(cacheKey);
  }

  private async deleteAllClientLaunchConfigs(
    issuer: string,
    clientId: string,
  ): Promise<void> {
    // First, query to get all items for this client
    const pk = `${issuer}#${clientId}`; // this.createClientPK(clientId);
    const result = await this.ddbClient.send(
      new QueryCommand({
        TableName: this.launchConfigTable,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': pk,
        }),
        ReturnConsumedCapacity: 'TOTAL',
      }),
    );
    this.validateDynamoDbResult(result, 'query launch configs for deletion');

    if (!result.Items || result.Items.length === 0) {
      this.logger.warn({ clientId }, 'launch configs not found for deletion');
      return; // Nothing to delete
    }

    // Delete all launch configs
    for (const item of result.Items) {
      const unmarshalled = unmarshall(item) as DynamoBase;
      await this.ddbClient.send(
        new DeleteItemCommand({
          TableName: this.launchConfigTable,
          Key: marshall({
            pk: unmarshalled.pk,
            sk: unmarshalled.sk,
          }),
          ReturnConsumedCapacity: 'TOTAL',
        }),
      );
      this.validateDynamoDbResult(result, 'delete launch config');
    }
  }

  private async updateClientLaunchConfigs(clientId: string): Promise<void> {
    this.logger.debug({ clientId }, 'updating client launch configs');

    const client = await this.getClientById(clientId);
    if (!client) {
      this.logger.warn({ clientId }, 'client not found for launch config update');
      return;
    }

    // Update launch configs for all deployments
    for (const deployment of client.deployments) {
      const launchConfig = await this.buildLtiLaunchConfig(clientId, deployment.id);
      await this.saveLaunchConfig(launchConfig);
    }

    this.logger.debug(
      { clientId, count: client.deployments.length },
      'client launch configs updated',
    );
  }

  private createClientPK(clientId: string): string {
    return `C#${clientId}`;
  }

  private createDeploymentSK(deploymentId: string): string {
    return `D#${deploymentId}`;
  }

  private createSessionKey(sessionId: string): string {
    return `S#${sessionId}`;
  }

  private createNonceKey(nonce: string): string {
    return `N#${nonce}`;
  }

  /**
   * Validates DynamoDB operation result and logs consumed capacity.
   *
   * @param result - DynamoDB command result
   * @param operation - Operation name for error messages
   * @throws {Error} When operation fails (non-200 status)
   */
  private validateDynamoDbResult(
    result: GetItemCommandOutput | PutItemCommandOutput | DeleteItemCommandOutput,
    operation: string,
  ): void {
    this.logger.debug({ result }, `${operation} result`);
    if (result?.ConsumedCapacity) {
      this.logger.debug(
        { consumedCapacity: result.ConsumedCapacity },
        'DynamoDB capacity consumed',
      );
    }

    if (result.$metadata.httpStatusCode !== 200) {
      const errorMessage = `Unable to ${operation} from dynamodb ${JSON.stringify(result.$metadata)}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  private buildClientFromDynamoItems(
    clientId: string,
    items: Record<string, AttributeValue>[],
  ): LTIClient | undefined {
    let clientRecord: LTIClient | undefined;
    const deploymentRecords = new Array<LTIDeployment>();

    for (const item of items) {
      const unmarshalled = unmarshall(item) as DynamoBase;
      switch (unmarshalled.type) {
        case 'Client': {
          // oxlint-disable-next-line no-unused-vars
          const { pk, sk, type, ...cleanClient } = unmarshalled as DynamoLTIClient;
          clientRecord = cleanClient as LTIClient;
          break;
        }
        case 'Deployment': {
          // oxlint-disable-next-line no-unused-vars
          const { pk, sk, type, ...cleanDeployment } =
            unmarshalled as DynamoLTIDeployment;
          deploymentRecords.push(cleanDeployment as LTIDeployment);
          break;
        }
      }
    }

    if (!clientRecord) {
      this.logger.warn({ clientId }, 'client data not found');
      return undefined;
    }

    return { ...clientRecord, deployments: deploymentRecords };
  }

  private async buildLtiLaunchConfig(
    clientId: string,
    deploymentId: string,
  ): Promise<LTILaunchConfig> {
    const client = await this.getClientById(clientId);
    const deployment = client?.deployments.find(
      (deployment) => deployment.id === deploymentId,
    );

    if (!client || !deployment) {
      throw new Error('Client or deployment not found');
    }

    return {
      authUrl: client.authUrl,
      clientId: client.clientId,
      deploymentId: deployment.deploymentId,
      iss: client.iss,
      jwksUrl: client.jwksUrl,
      tokenUrl: client.tokenUrl,
    };
  }
}
