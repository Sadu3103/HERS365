// @ts-nocheck
// Surgical, idempotent migration: create the two messaging-safety tables only.
// Does not touch any existing table. Run with DATABASE_PUBLIC_URL/DATABASE_URL set.
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS message_blocks (
      id serial PRIMARY KEY,
      blocker_id integer NOT NULL,
      blocker_role text NOT NULL,
      blocked_id integer NOT NULL,
      blocked_role text NOT NULL,
      created_at timestamp DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS message_reports (
      id serial PRIMARY KEY,
      reporter_id integer NOT NULL,
      reporter_role text NOT NULL,
      reported_id integer NOT NULL,
      reported_role text NOT NULL,
      reason text NOT NULL,
      details text,
      status text DEFAULT 'pending',
      created_at timestamp DEFAULT now(),
      reviewed_at timestamp
    );
  `);
  const { rows } = await pool.query(`SELECT tablename FROM pg_tables WHERE tablename IN ('message_blocks','message_reports') ORDER BY 1;`);
  console.log('✅ safety tables present:', rows.map((r) => r.tablename).join(', '));
  process.exit(0);
}

run().catch((e) => { console.error('Migration failed:', e); process.exit(1); });
