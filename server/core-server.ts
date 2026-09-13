// Lean production entrypoint: core REST API on Node + Postgres only.
// Skips the enterprise scaffolding (Cosmos, Service Bus, compliance, OTel) in
// index.ts so the API boots on any container host with just DATABASE_URL set.
// MUST be first: side-effecting import that loads the repo-root .env before any
// other module (via ./app) reads process.env at its top level.
import './load-env';
import { createApp } from './app';

// dev:core sets APP_ENV (not NODE_ENV); resolve once so the guards below fire
// correctly under either. Mirrors the demo gate in authRoutes.ts.
const APP_ENV = process.env.NODE_ENV ?? process.env.APP_ENV;

// [D-02] Fail fast on missing required env vars
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'];

// [D-09] Payments can be disabled in dev (PAYMENTS_ENABLED=false) so the
// platform runs without Stripe. When enabled (the default), all three Stripe
// keys are required at startup — otherwise the server boots fine and only
// fails when a user actually tries to pay.
const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED !== 'false';
if (PAYMENTS_ENABLED) {
  REQUIRED_ENV_VARS.push('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRO_PRICE_ID');
}

if (APP_ENV !== 'test' && APP_ENV !== 'development') {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// [D-07] Guard against weak JWT signing secrets. Runs in every environment —
// a short/known secret used in dev tends to leak into prod, and a forgeable
// token is forgeable everywhere. Require at least 32 characters.
if (APP_ENV !== 'test') {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    console.error(
      `JWT_SECRET must be set and at least 32 characters (got ${secret ? `${secret.length} chars` : 'unset'}). ` +
      `Generate one with:  openssl rand -base64 48`
    );
    process.exit(1);
  }
}

const port = process.env.PORT || process.env.COSMOS_API_PORT || 4000;

createApp().listen(port, () => {
  console.log(`HERS365 core API listening on port ${port}`);
});
