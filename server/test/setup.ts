import { afterAll } from 'vitest';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/hers365_test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_POOL_MAX = '5';
process.env.DB_POOL_MIN = '1';

// Dynamic import so the pool opens only after the env above is set. Per-file
// pool.end() is safe only because vitest isolates module state per test file —
// don't set isolate:false without rethinking this teardown.
afterAll(async () => {
  const { pool } = await import('../db');
  await pool.end();
});
