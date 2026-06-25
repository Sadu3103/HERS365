import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// Applies pending SQL migrations before the API boots (wired into `npm start`).
// Uses drizzle-orm's migrator (a prod dependency) rather than drizzle-kit
// (dev only), so it runs inside the production image. The prod DB was
// baselined to migration 0005, so this only applies migrations generated
// after that — preventing the schema drift that took prod down on 2026-06-25.
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[migrate] DATABASE_URL is not set');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: './migrations' });
  await pool.end();
  console.log('[migrate] schema up to date');
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
