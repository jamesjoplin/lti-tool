import type { LTIDeployment } from '@lti-tool/core';

import type { DynamoBase } from './dynamoBase';

export interface DynamoLTIDeployment extends LTIDeployment, DynamoBase {
  type: 'Deployment';
}
