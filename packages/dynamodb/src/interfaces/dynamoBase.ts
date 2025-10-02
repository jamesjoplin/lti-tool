export interface DynamoBase {
  pk: string;
  sk: string;
  gsi1pk?: string;
  gsi1sk?: string;
  type: 'Client' | 'Deployment';
}
