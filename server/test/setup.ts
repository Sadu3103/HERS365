import { afterAll } from 'vitest';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/hers365_test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_POOL_MAX = '5';
process.env.DB_POOL_MIN = '1';
// Stripe keys must be present at module-import time so paymentRoutes can build
// its Stripe client. The values are dummies — the real Stripe SDK only makes
// network calls when a handler explicitly invokes it, and the tests that touch
// paymentRoutes stay on the DB-only / signature-verification paths.
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_dummy';

// Dynamic import so the pool opens only after the env above is set. Per-file
// pool.end() is safe only because vitest isolates module state per test file —
// don't set isolate:false without rethinking this teardown.
afterAll(async () => {
  const { pool } = await import('../db');
  await pool.end();
});
