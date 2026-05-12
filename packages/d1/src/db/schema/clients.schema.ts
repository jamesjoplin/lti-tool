import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const clientsTable = sqliteTable(
  'lti_tool_clients',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    iss: text('iss').notNull(),
    clientId: text('client_id').notNull(),
    authUrl: text('auth_url').notNull(),
    tokenUrl: text('token_url').notNull(),
    jwksUrl: text('jwks_url').notNull(),
  },
  (table) => [
    index('lti_tool_clients_issuer_client_idx').on(table.clientId, table.iss),
    uniqueIndex('lti_tool_clients_iss_client_id_unique').on(table.iss, table.clientId),
  ],
);
