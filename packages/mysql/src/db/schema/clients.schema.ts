import { index, mysqlTable, text, unique, varchar } from 'drizzle-orm/mysql-core';

export const clientsTable = mysqlTable(
  'clients',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    iss: varchar({ length: 255 }).notNull(),
    clientId: varchar({ length: 255 }).notNull(),
    authUrl: text().notNull(),
    tokenUrl: text().notNull(),
    jwksUrl: text().notNull(),
  },
  (table) => [
    index('issuer_client_idx').on(table.clientId, table.iss),
    unique('iss_client_id_unique').on(table.iss, table.clientId),
  ],
);
