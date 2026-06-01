// @ts-nocheck
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { logger } from './logger';
import 'dotenv/config';

// PostgreSQL connection pool (tuned for 50K users)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/hers365',
  max: Number(process.env.DB_POOL_MAX) || 100,
  min: Number(process.env.DB_POOL_MIN) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

logger.info('Connecting to database', { url: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
export const dbAsync = drizzle(pool, { schema });

logger.info('Database connection established');

// Export pool for use in routes and health checks
export { pool };
export { pool as dbConnection };
