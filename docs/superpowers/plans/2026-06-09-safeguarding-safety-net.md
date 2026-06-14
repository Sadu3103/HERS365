# Safeguarding Safety Net Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Test harness + required CI gate covering the four safeguarding-critical paths (auth/JWT, minor-data exposure, messaging access, parent-gating) against real Postgres.

**Architecture:** Refactor `core-server.ts` into a `createApp()` factory; drive it with vitest + supertest against a `hers365_test` Postgres database (service container in CI). Tables are truncated between tests. Each suite asserts the *negative* — the gate holding.

**Tech Stack:** vitest, supertest, drizzle-kit (existing), postgres:16.

**Spec:** `docs/superpowers/specs/2026-06-09-safeguarding-safety-net-design.md`

**Deviation from spec (flagged for review):** spec said per-test *transaction rollback*; this plan uses *truncate between tests* instead. `db.ts` exports a module-level pool singleton that all routes import — injecting a transaction-bound db would be an invasive refactor. Truncate + `fileParallelism: false` gives the same isolation at this scale.

**Known gaps the suites will expose (confirmed by code reading, 2026-06-09):**
1. `POST /api/messages` has **no parent-gating** — any coach can message any athlete (`server/api/messages.ts:118-148`). PR4 closes it.
2. `GET /api/athletes` is unauthenticated and only strips `passwordHash` — the comment at `api/athletes.ts:11` claims email is excluded but the code doesn't do it (`api/athletes.ts:35`). PR2 closes it.
3. Two divergent auth middlewares: `auth.ts` (canonical, dev-secret fallback) vs `middleware/requireAuth.ts` (raw `process.env.JWT_SECRET`, `@ts-nocheck`). PR2 consolidates onto `auth.ts`.

---

## File structure

```
server/
  app.ts                      # NEW — createApp() factory (express app, no listen)
  core-server.ts              # MODIFIED — boots createApp(), keeps listen()
  vitest.config.ts            # NEW
  package.json                # MODIFIED — vitest/supertest deps + test scripts
  api/athletes.ts             # MODIFIED (PR2) — safe column projection, canonical requireAuth
  api/messages.ts             # MODIFIED (PR3, PR4) — partner existence check, parent-gate
  test/
    setup.ts                  # NEW — test env vars, pool teardown
    helpers/db.ts             # NEW — truncate reset
    helpers/fixtures.ts       # NEW — athlete/coach/parent/link/token factories
    auth.test.ts              # NEW (PR1)
    exposure.test.ts          # NEW (PR2)
    messaging.test.ts         # NEW (PR3)
    parent-gating.test.ts     # NEW (PR4)
.github/workflows/ci.yml      # MODIFIED (PR1) — "Server — tests" job
```

Local prerequisite (one-time): `createdb hers365_test` (or Docker pg on :5432).

---

# PR1 — Harness, createApp(), fixtures, auth suite, CI

### Task 1: Test dependencies and vitest config

**Files:**
- Modify: `server/package.json`
- Create: `server/vitest.config.ts`
- Create: `server/test/setup.ts`

- [ ] **Step 1: Install dev dependencies**

```bash
cd server && npm i -D vitest supertest @types/supertest
```

- [ ] **Step 2: Add scripts to `server/package.json`** (in `"scripts"`)

```json
"test": "vitest run",
"test:watch": "vitest",
"db:push:test": "DATABASE_URL=postgres://localhost:5432/hers365_test drizzle-kit push --force"
```

- [ ] **Step 3: Create `server/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 15000,
  },
});
```

`fileParallelism: false` because all files share one database and reset via truncate.

- [ ] **Step 4: Create `server/test/setup.ts`**

Env must be set before any test file imports `db.ts` (which reads env at import time). setupFiles load first, so this works:

```ts
import { afterAll } from 'vitest';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/hers365_test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_POOL_MAX = '5';
process.env.DB_POOL_MIN = '1';

afterAll(async () => {
  const { pool } = await import('../db');
  await pool.end();
});
```

Note: `DB_POOL_MIN=1` not `0` — `db.ts` does `Number(process.env.DB_POOL_MIN) || 10`, so `0` falls through to 10.

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/vitest.config.ts server/test/setup.ts
git commit -m "test(server): vitest + supertest harness config"
```

### Task 2: createApp() factory (TDD)

**Files:**
- Create: `server/app.ts`
- Modify: `server/core-server.ts`
- Test: `server/test/app.test.ts`

- [ ] **Step 1: Write the failing test** — `server/test/app.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('createApp', () => {
  it('serves /health without listening on a port', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && npx vitest run test/app.test.ts
```
Expected: FAIL — `Cannot find module '../app'`.

- [ ] **Step 3: Create `server/app.ts`** — the mounting block moves verbatim from `core-server.ts:25-50`:

```ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import coachRouter from './coachRoutes';
import paymentRouter from './paymentRoutes';
import authRoutesRouter from './authRoutes';
import adminRouter from './adminRoutes';
import uploadRouter from './uploadRoutes';
import emailAuthRouter from './emailAuthRoutes';
import mainApiRouter from './routes';
import { rankingsRouter } from './api/rankings';
import { athletesRouter } from './api/athletes';
import { messagesRouter } from './api/messages';
import { trainingRouter } from './api/training';
import { usersRouter } from './api/users';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: (process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
      .split(',').map(o => o.trim()),
    credentials: true,
  }));
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/api/payments', paymentRouter);
  app.use('/api/rankings', rankingsRouter);
  app.use('/api/athletes', athletesRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/training', trainingRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/coach', coachRouter);
  app.use('/api/auth', authRoutesRouter);
  app.use('/api/auth/secure', authRoutesRouter);
  app.use('/api/auth/email', emailAuthRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', mainApiRouter);

  return app;
}
```

No `@ts-nocheck` on this file.

- [ ] **Step 4: Rewrite `server/core-server.ts`** to boot the factory (full new contents):

```ts
// Lean production entrypoint: core REST API on Node + Postgres only.
// Skips the enterprise scaffolding (Cosmos, Service Bus, compliance, OTel) in
// index.ts so the API boots on any container host with just DATABASE_URL set.
import 'dotenv/config';
import { createApp } from './app';

const port = process.env.PORT || process.env.COSMOS_API_PORT || 4000;

createApp().listen(port, () => {
  console.log(`HERS365 core API listening on port ${port}`);
});
```

Env loading must use the side-effect form `import 'dotenv/config'`, NOT `dotenv.config()` called between imports — ESM hoists all imports, so a `dotenv.config()` statement would run *after* `./app` (and its router modules that read env) already executed. The side-effect import listed first executes first. This matches how `db.ts` already does it.

- [ ] **Step 5: Run the test, verify it passes**

```bash
npx vitest run test/app.test.ts
```
Expected: PASS (1 test). Requires local `hers365_test` DB to exist (module import opens the pool): `createdb hers365_test && npm run db:push:test` first.

- [ ] **Step 6: Verify the server still boots for real**

```bash
npm run dev:core
```
Expected: `HERS365 core API listening on port 4000`, then `curl localhost:4000/health` → `{"status":"ok",...}`. Ctrl-C after.

- [ ] **Step 7: Commit**

```bash
git add server/app.ts server/core-server.ts server/test/app.test.ts
git commit -m "refactor(server): extract createApp() factory for testability"
```

### Task 3: DB reset + fixtures

**Files:**
- Create: `server/test/helpers/db.ts`
- Create: `server/test/helpers/fixtures.ts`

- [ ] **Step 1: Create `server/test/helpers/db.ts`**

```ts
import { pool } from '../../db';

const TABLES = [
  'messages',
  'message_requests',
  'parent_child_relations',
  'parents',
  'coaches',
  'players',
];

export async function resetDb() {
  await pool.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}
```

- [ ] **Step 2: Create `server/test/helpers/fixtures.ts`**

```ts
import { db } from '../../db';
import * as schema from '../../schema';
import { signToken, type UserRole } from '../../auth';
import bcrypt from 'bcryptjs';

// cost 4: fast for tests, same algorithm as hashPassword (cost 12)
const PW_HASH = bcrypt.hashSync('Test-pw-123', 4);
let seq = 0;
const email = (tag: string) => `${tag}-${++seq}@test.local`;

export async function makeAthlete(overrides: Partial<typeof schema.players.$inferInsert> = {}) {
  const [row] = await db.insert(schema.players).values({
    email: email('athlete'),
    passwordHash: PW_HASH,
    name: 'Test Athlete',
    age: 15,
    state: 'CA',
    city: 'Los Angeles',
    ...overrides,
  }).returning();
  return row;
}

export async function makeCoach(overrides: Partial<typeof schema.coaches.$inferInsert> = {}) {
  const [row] = await db.insert(schema.coaches).values({
    email: email('coach'),
    passwordHash: PW_HASH,
    name: 'Test Coach',
    ...overrides,
  }).returning();
  return row;
}

export async function makeParent(overrides: Partial<typeof schema.parents.$inferInsert> = {}) {
  const [row] = await db.insert(schema.parents).values({
    email: email('parent'),
    passwordHash: PW_HASH,
    name: 'Test Parent',
    ...overrides,
  }).returning();
  return row;
}

export async function linkParentChild(parentId: number, playerId: number) {
  const [row] = await db.insert(schema.parentChildRelations).values({
    parentId, playerId, relationship: 'guardian',
  }).returning();
  return row;
}

export function tokenFor(user: { id: number; email: string; name: string | null }, role: UserRole) {
  return signToken({ userId: user.id, email: user.email, role, name: user.name ?? '' });
}
```

- [ ] **Step 2b: Quick sanity check the fixtures compile and run**

Add temporarily to the bottom of `test/app.test.ts` and run, then delete:

```ts
it('fixtures create rows', async () => {
  const a = await makeAthlete();
  expect(a.id).toBeGreaterThan(0);
});
```
(with `import { makeAthlete } from './helpers/fixtures';`). Run `npx vitest run test/app.test.ts` → PASS, then remove the temp test and import.

- [ ] **Step 3: Commit**

```bash
git add server/test/helpers/
git commit -m "test(server): db reset + role fixtures"
```

### Task 4: Auth/JWT suite

**Files:**
- Test: `server/test/auth.test.ts`

- [ ] **Step 1: Write the suite** — `server/test/auth.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('JWT gates', () => {
  it('401s with no token', async () => {
    const res = await request(app).get('/api/messages/conversations');
    expect(res.status).toBe(401);
  });

  it('401s with a garbage token', async () => {
    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  it('401s with an expired token', async () => {
    const expired = jwt.sign(
      { userId: 1, email: 'x@test.local', role: 'athlete', name: 'X' },
      'test-secret',
      { expiresIn: '-1h' },
    );
    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('403s an athlete on coach endpoints', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .get('/api/coach/messages')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
    expect(res.status).toBe(403);
  });

  it('403s a coach on admin endpoints', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(403);
  });
});

describe('register / login round trip', () => {
  it('registers an athlete, logs in, and never leaks passwordHash', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      email: 'newathlete@test.local',
      password: 'Str0ng-pass!',
      name: 'New Athlete',
      role: 'athlete',
    });
    expect([200, 201]).toContain(reg.status);
    expect(JSON.stringify(reg.body)).not.toContain('passwordHash');
    expect(JSON.stringify(reg.body)).not.toContain('password_hash');

    const login = await request(app).post('/api/auth/login').send({
      email: 'newathlete@test.local',
      password: 'Str0ng-pass!',
    });
    expect(login.status).toBe(200);
    expect(login.body.token ?? login.body.data?.token).toBeTruthy();
    expect(JSON.stringify(login.body)).not.toContain('passwordHash');

    const token = login.body.token ?? login.body.data?.token;
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(JSON.stringify(me.body)).not.toContain('passwordHash');
  });

  it('rejects login with a wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'a2@test.local', password: 'Right-pass-1', name: 'A2', role: 'athlete',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'a2@test.local', password: 'Wrong-pass-1',
    });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run test/auth.test.ts
```
Expected: mostly PASS (these gates exist in `auth.ts`/`authRoutes.ts`). If the register/login shape assertions fail, read the actual response in the failure output and tighten the assertions to the real contract — do NOT weaken the `passwordHash` checks; if those fail, the route is leaking and the fix goes in `authRoutes.ts` (strip before responding), not in the test. Note: `authRoutes.ts` has a `loginLimiter` on login — if rate-limit 429s appear across tests, register/login with unique emails per test (already done above).

- [ ] **Step 3: Run the whole suite, verify green**

```bash
npm test
```
Expected: all files PASS.

- [ ] **Step 4: Commit**

```bash
git add server/test/auth.test.ts
git commit -m "test(server): auth/JWT gate suite"
```

### Task 5: CI job

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Append the job** to `.github/workflows/ci.yml` under `jobs:`

```yaml
  server-tests:
    name: Server — tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: server
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: hers365_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/hers365_test
      TEST_DATABASE_URL: postgres://postgres:postgres@localhost:5432/hers365_test
      JWT_SECRET: test-secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20.x"
          cache: npm
          cache-dependency-path: server/package-lock.json
      - run: npm ci
      - run: npx drizzle-kit push --force
      - run: npm test
```

- [ ] **Step 2: Commit, push the PR1 branch, open the PR**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: server test job with postgres service"
git push -u origin HEAD
gh pr create -B main -t "Safeguarding safety net PR1: test harness + auth suite" \
  -b "createApp() factory, vitest+supertest harness vs real Postgres, auth/JWT gate suite, CI job. Per docs/superpowers/specs/2026-06-09-safeguarding-safety-net-design.md"
```

- [ ] **Step 3: Verify the new check runs green on the PR**

```bash
gh pr checks --watch
```
Expected: "Server — tests" appears and passes alongside the two existing checks.

- [ ] **Step 4 (repo settings, owner action): add "Server — tests" to required checks on `main`** — Settings → Branches → main → require "Server — tests". Do this only after the job is green on PR1.

---

# PR2 — Minor-data exposure suite

### Task 6: Exposure tests + safe projection in `api/athletes.ts`

**Files:**
- Test: `server/test/exposure.test.ts`
- Modify: `server/api/athletes.ts`

- [ ] **Step 1: Write the failing suite** — `server/test/exposure.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

const FORBIDDEN_PUBLIC = ['passwordHash', 'password_hash', '@test.local', 'zipCode'];

describe('minor data exposure — /api/athletes', () => {
  it('public athlete list never contains email, passwordHash, or zip', async () => {
    await makeAthlete({ zipCode: '90001' });
    const res = await request(app).get('/api/athletes');
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    for (const needle of FORBIDDEN_PUBLIC) {
      expect(body, `leaked: ${needle}`).not.toContain(needle);
    }
  });

  it('public athlete detail never contains email, passwordHash, or zip', async () => {
    const a = await makeAthlete({ zipCode: '90001' });
    const res = await request(app).get(`/api/athletes/${a.id}`);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    for (const needle of FORBIDDEN_PUBLIC) {
      expect(body, `leaked: ${needle}`).not.toContain(needle);
    }
  });
});

describe('minor data exposure — /api/players (routes.ts)', () => {
  it('players list never contains passwordHash', async () => {
    await makeAthlete();
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/players')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    // whatever the status contract is, the body must never carry a hash
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run test/exposure.test.ts
```
Expected: FAIL — list/detail leak `@test.local` emails (code only strips `passwordHash`, `api/athletes.ts:35,63`).

- [ ] **Step 3: Implement safe projection in `server/api/athletes.ts`**

Replace the per-route `({ passwordHash, ...safe })` destructuring with one helper at the top of the file, applied in the list (`:35`), detail (`:63`), and update (`:109`) responses:

```ts
// Public projection of a player row. Email/zip are contact info for a
// minor — never expose them on athlete endpoints.
function publicAthlete(p: Record<string, unknown>) {
  const { passwordHash, email, zipCode, ...safe } = p;
  return safe;
}
```

Usage: `rows.map(publicAthlete)`, `publicAthlete(athlete)`, `publicAthlete(updated[0])`.

Also in this file: swap `import { requireAuth } from '../middleware/requireAuth'` to `import { requireAuth } from '../auth'` (canonical middleware — the `middleware/` copy verifies with raw `process.env.JWT_SECRET` and drifts from the signer).

- [ ] **Step 4: Run, verify pass; run full suite**

```bash
npx vitest run test/exposure.test.ts && npm test
```
Expected: PASS. If the client's athlete pages render email anywhere, `cd client && npm run build` still passes (build-time check only; grep `client/src` for `.email` usages on athlete objects and remove any — they were reading leaked data).

- [ ] **Step 5: Commit, push, PR**

```bash
git add server/api/athletes.ts server/test/exposure.test.ts
git commit -m "fix(server): stop leaking minor contact info on athlete endpoints"
git push -u origin HEAD
gh pr create -B main -t "Safeguarding safety net PR2: minor-data exposure suite" -b "Asserts no email/zip/passwordHash leaks on athlete surfaces; fixes the /api/athletes leak. Spec: docs/superpowers/specs/2026-06-09-safeguarding-safety-net-design.md"
```

---

# PR3 — Messaging access suite

### Task 7: Thread scoping + partner validation

**Files:**
- Test: `server/test/messaging.test.ts`
- Modify: `server/api/messages.ts`

- [ ] **Step 1: Write the suite** — `server/test/messaging.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

async function seedMessage(coachId: number, athleteId: number, content: string) {
  await db.insert(schema.messages).values({
    coachId, athleteId, senderId: coachId, senderType: 'coach', content, read: false,
  });
}

describe('messaging access', () => {
  it("a third party cannot read someone else's thread", async () => {
    const coach = await makeCoach();
    const athleteA = await makeAthlete();
    const athleteB = await makeAthlete();
    await seedMessage(coach.id, athleteA.id, 'private to A');

    const res = await request(app)
      .get(`/api/messages/conversations/${coach.id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(athleteB, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('private to A');
  });

  it('sending to a nonexistent partner is a 404, not a 500 or an orphan row', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: 99999, content: 'hello?' });
    expect(res.status).toBe(404);
  });

  it("cannot respond to another user's message request", async () => {
    const coach = await makeCoach();
    const otherCoach = await makeCoach();
    const athlete = await makeAthlete();
    const [reqRow] = await db.insert(schema.messageRequests).values({
      athleteId: athlete.id, receiverId: coach.id, content: 'hi', status: 'pending',
    }).returning();

    const res = await request(app)
      .post(`/api/messages/requests/${reqRow.id}/respond`)
      .set('Authorization', `Bearer ${tokenFor(otherCoach, 'coach')}`)
      .send({ action: 'approve' });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run to verify the partner-existence test fails**

```bash
npx vitest run test/messaging.test.ts
```
Expected: third-party and respond tests PASS (scoping exists, `api/messages.ts:87-89,235-237`); nonexistent-partner test FAILS with 500 (FK violation surfaces as the catch-all).

- [ ] **Step 3: Add the existence check** in `server/api/messages.ts` `POST /` handler, after the `!partnerId || !content` guard (line ~126):

```ts
const partnerTable = isCoach ? schema.players : schema.coaches;
const [partner] = await db.select({ id: partnerTable.id })
  .from(partnerTable)
  .where(eq(partnerTable.id, Number(partnerId)))
  .limit(1);
if (!partner) {
  return res.status(404).json({ success: false, error: 'Partner not found' });
}
```

- [ ] **Step 4: Run, verify pass; full suite; commit, push, PR**

```bash
npx vitest run test/messaging.test.ts && npm test
git add server/api/messages.ts server/test/messaging.test.ts
git commit -m "test(server): messaging access suite + partner existence check"
git push -u origin HEAD
gh pr create -B main -t "Safeguarding safety net PR3: messaging access suite" -b "Thread scoping, request-respond authorization, partner validation. Spec: docs/superpowers/specs/2026-06-09-safeguarding-safety-net-design.md"
```

---

# PR4 — Parent-gating

### Task 8: Gate coach↔athlete messaging on a parent-approved link

**Files:**
- Test: `server/test/parent-gating.test.ts`
- Modify: `server/api/messages.ts`

The product rule (CLAUDE.md): *all coach↔athlete contact is gated through parents*. The enforcement contract: a message may only be sent when an **approved `message_requests` row with a non-null `parentId`** exists for the (athlete, coach) pair. The non-null `parentId` is what encodes "a parent was in the loop."

- [ ] **Step 1: Write the failing suite** — `server/test/parent-gating.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, linkParentChild, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

async function approveContact(athleteId: number, coachId: number, parentId: number | null) {
  await db.insert(schema.messageRequests).values({
    athleteId, receiverId: coachId, content: 'intro', status: 'approved', parentId,
  });
}

describe('parent-gating of coach↔athlete messaging', () => {
  it('blocks a coach messaging an athlete with no approved link', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'hi kid' });
    expect(res.status).toBe(403);
  });

  it('blocks even when a request is approved but has no parent attached', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await approveContact(athlete.id, coach.id, null);
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'hi' });
    expect(res.status).toBe(403);
  });

  it('allows messaging once a parent-approved link exists, both directions', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const parent = await makeParent();
    await linkParentChild(parent.id, athlete.id);
    await approveContact(athlete.id, coach.id, parent.id);

    const fromCoach = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'welcome to tryouts' });
    expect(fromCoach.status).toBe(201);

    const fromAthlete = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ partnerId: coach.id, content: 'thanks coach' });
    expect(fromAthlete.status).toBe(201);
  });
});
```

- [ ] **Step 2: Run to verify the block tests fail**

```bash
npx vitest run test/parent-gating.test.ts
```
Expected: both "blocks" tests FAIL (currently 201 — the gap), "allows" test passes incidentally.

- [ ] **Step 3: Implement the gate** in `server/api/messages.ts`.

Add `isNotNull` to the drizzle import (line 2):

```ts
import { and, eq, or, desc, sql, isNotNull } from 'drizzle-orm';
```

Add the helper above the `POST /` handler:

```ts
// CLAUDE.md: all coach↔athlete contact is gated through parents. A pair may
// message only after a message_request was approved WITH a parent attached.
async function hasParentApprovedLink(athleteId: number, coachId: number): Promise<boolean> {
  const [link] = await db.select({ id: schema.messageRequests.id })
    .from(schema.messageRequests)
    .where(and(
      eq(schema.messageRequests.athleteId, athleteId),
      eq(schema.messageRequests.receiverId, coachId),
      eq(schema.messageRequests.status, 'approved'),
      isNotNull(schema.messageRequests.parentId),
    ))
    .limit(1);
  return Boolean(link);
}
```

In the `POST /` handler, after the partner-existence check from PR3:

```ts
const pairAthleteId = isCoach ? Number(partnerId) : userId;
const pairCoachId = isCoach ? userId : Number(partnerId);
if (!(await hasParentApprovedLink(pairAthleteId, pairCoachId))) {
  return res.status(403).json({
    success: false,
    error: 'Messaging requires a parent-approved contact request',
  });
}
```

- [ ] **Step 4: Run, verify pass; full suite**

```bash
npx vitest run test/parent-gating.test.ts && npm test
```
Expected: all PASS. If existing seeded demo flows break (seed.ts creates messages without requests), update `seed.ts` to also insert an approved `message_requests` row with a `parentId` for any seeded coach↔athlete thread.

- [ ] **Step 5: File the product follow-up issue** — the `respond` endpoint lets the *coach* approve requests; parent approval needs its own flow (parent auth + UI). Out of scope here, but the gate above already refuses links without a parent attached.

```bash
gh issue create -t "Parent approval flow for message requests" \
  -b "PR4 gates messaging on approved message_requests with non-null parentId. Today no endpoint lets a PARENT approve/attach themselves to a request — requests/:id/respond is receiver(coach)-driven. Need: parent-facing approve flow, and request creation that notifies the parent. Ref: docs/superpowers/specs/2026-06-09-safeguarding-safety-net-design.md"
```

- [ ] **Step 6: Commit, push, PR**

```bash
git add server/api/messages.ts server/test/parent-gating.test.ts server/seed.ts
git commit -m "feat(server): parent-gate coach<->athlete messaging"
git push -u origin HEAD
gh pr create -B main -t "Safeguarding safety net PR4: parent-gating enforced" -b "Coach<->athlete messaging now requires a parent-approved contact link. Closes the gap found in the 2026-06-09 scan. Spec: docs/superpowers/specs/2026-06-09-safeguarding-safety-net-design.md"
```

---

## Verification checklist (end state)

- [ ] `cd server && npm test` green locally against `hers365_test`
- [ ] "Server — tests" required check green on all four PRs
- [ ] `npm run dev:core` still boots; `curl localhost:4000/health` ok
- [ ] Client build passes (`cd client && npm run build`) — athlete pages no longer read `email` off athlete API responses
- [ ] `@ts-nocheck` removed from any file this work modified where removal compiles (`app.ts` new-clean; check `api/athletes.ts`, `api/messages.ts` — neither had the pragma; `routes.ts` keeps it unless touched beyond stripPlayer)
- [ ] Follow-up issue filed for the parent approval flow
