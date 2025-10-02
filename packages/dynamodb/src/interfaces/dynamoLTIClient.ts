import type { LTIClient } from '@lti-tool/core';

import type { DynamoBase } from './dynamoBase';

export interface DynamoLTIClient extends LTIClient, DynamoBase {
  type: 'Client';
}
