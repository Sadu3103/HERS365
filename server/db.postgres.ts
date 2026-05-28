// PostgreSQL database configuration for production (50K users)
// Run: npm run db:push after switching

import { pgTable, serial, text, integer, real, timestamp, json, varchar } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Connection pool for PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/hers365',
  max: 100, // Max connections for 50K users
  min: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

import * as schema from './schema';
export const db = drizzle(pool, { schema });

// Export for use in routes
export { pool };