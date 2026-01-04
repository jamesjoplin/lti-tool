import { datetime, index, json, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import type { LTIDynamicRegistrationSession } from '@lti-tool/core';

export const registrationSessionsTable = mysqlTable(
  'registration_sessions',
  {
    id: varchar({ length: 36 }).primaryKey(),
    data: json().$type<Omit<LTIDynamicRegistrationSession, 'sessionId'>>().notNull(),
    expiresAt: datetime().notNull(),
  },
  (table) => [index('expires_at_idx').on(table.expiresAt)],
);
