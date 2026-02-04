import { index, pgTable, text, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { clientsTable } from './clients.schema';

export const deploymentsTable = pgTable(
  'deployments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deploymentId: varchar('deployment_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    description: text('description'),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clientsTable.id),
  },
  (table) => [
    index('deployment_id_idx').on(table.deploymentId),
    uniqueIndex('client_deployment_unique').on(table.clientId, table.deploymentId),
  ],
);
