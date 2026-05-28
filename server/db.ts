// @ts-nocheck
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { logger } from './logger';
import 'dotenv/config';

// Use SQLite database file
const sqlite: Database = new Database(process.env.DATABASE_URL || './hers365.sqlite');

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

logger.info('Connecting to database', { url: process.env.DATABASE_URL });

export const db = drizzle(sqlite, { schema });
export const dbAsync = drizzle(sqlite, { schema });

logger.info('Database connection established');

// Export database for health checks
export { sqlite as dbConnection };
