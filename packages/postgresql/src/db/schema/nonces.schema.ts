import { pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const noncesTable = pgTable('nonces', {
  nonce: varchar('nonce', { length: 255 }).primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
