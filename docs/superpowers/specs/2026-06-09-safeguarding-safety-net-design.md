# Safeguarding Safety Net — Design

**Date:** 2026-06-09
**Status:** Approved (Samuel, in-session)

## Problem

HERS365 is a platform for underage athletes with zero automated tests across 130
source files, and `@ts-nocheck` on 25 of 65 server files. CI's `tsc --noEmit`
passes while real runtime bugs sail through. A regression that exposes a minor's
data or bypasses parent-gating currently ships silently.

Scan finding that raises the stakes: `parent_child_relations` is defined in
`schema.ts` but no route code queries it — the "all coach↔athlete contact is
gated through parents" rule from CLAUDE.md may not be enforced in code today.
The parent-gating test suite is what proves this one way or the other.

## Goal

A test harness plus a required CI gate that exercises the four critical paths
against a real Postgres, so safeguarding regressions fail CI instead of shipping.

## Architecture

### Harness (`server/test/`)

- **vitest + supertest** driving the real Express app.
- Refactor `core-server.ts` to export a `createApp()` factory (app without
  `listen()`); `core-server.ts` keeps booting it for dev/prod. Small, contained
  change — route mounting stays identical.
- **Database:** real Postgres.
  - CI: `postgres:16` GitHub Actions service container.
  - Local: Docker or local pg (`postgres://localhost:5432/hers365_test`).
  - Schema via `drizzle-kit push` once per run; **per-test transaction
    rollback** for isolation.
- **Fixtures:** seed helper creating an athlete (minor), a coach, a parent, and
  a `parent_child_relations` row, plus JWT minting for each role.

### Test suites — assert the negative (the gate)

1. **auth/JWT** — no token / expired / wrong-role → 401/403. `passwordHash`
   never present in any response body.
2. **minor-data exposure** — `/api/athletes`, `/api/profile`, rankings never
   leak a minor's contact info or media to an unrelated or unauthenticated
   caller.
3. **messaging** — cannot read or post to a conversation you're not a party
   to; minor↔coach DM requires the parent link.
4. **parent-gating** — coach→athlete contact without a
   `parent_child_relations` row is blocked. If the gate turns out not to exist,
   the test lands as `.fails()` documenting required behavior, plus a filed
   issue — the suite defines the contract either way.

### `@ts-nocheck` retirement — scoped, not repo-wide

Remove the pragma only on files a suite touches (`routes.ts`,
`coachRoutes.ts`, `api/messages.ts`), fixing the real type errors that surface.

### CI

Third required check in `ci.yml`: **"Server — tests"** with the Postgres
service container. Added to protected `main`'s required checks alongside the
existing client build+lint and server tsc checks.

## Sequencing (multi-PR)

1. **PR1** — harness, `createApp()` refactor, DB fixtures, auth suite, CI job.
2. **PR2** — minor-data exposure suite.
3. **PR3** — messaging suite.
4. **PR4** — parent-gating suite (+ follow-up issue if the gate is missing).

## Out of scope (v1)

- Client/component tests.
- The dead `index.ts` / Azure enterprise path (separate cleanup effort).
- Load/e2e (`test:e2e`, `test:performance` scripts are a separate concern).
- Repo-wide `@ts-nocheck` removal.

## Error handling & edge cases

- Tests must fail loudly if the test DB is missing (clear setup message), not
  skip.
- Transaction rollback isolation means no test ordering dependencies; any
  fixture needed is created inside the test's transaction.
- JWT fixtures use the same signing path as production code (no parallel
  test-only auth logic that could drift).
