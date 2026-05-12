import type { AnyD1Database } from 'drizzle-orm/d1';
import type { Logger } from 'pino';

export interface D1StorageConfig {
  database: AnyD1Database;
  logger?: Logger;
}
