import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { clientsTable } from './clients.schema.js';

export const deploymentsTable = sqliteTable(
  'lti_tool_deployments',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => clientsTable.id, { onDelete: 'cascade' }),
    deploymentId: text('deployment_id').notNull(),
    name: text('name'),
    description: text('description'),
  },
  (table) => [
    index('lti_tool_deployments_deployment_id_idx').on(table.deploymentId),
    uniqueIndex('lti_tool_deployments_client_deployment_unique').on(
      table.clientId,
      table.deploymentId,
    ),
  ],
);
