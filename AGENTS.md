# HERS365 — Codex Context

A safe online community for girls who play flag football (starting in California). Athletes build profiles, connect with each other and with coaches, post and watch short-form reels, and grow a community. `client/` (React + Vite SPA) + `server/` (Express + Drizzle/Postgres). No root package.json — each is its own workspace.

## ⚠️ This is a platform for minors — safety is a feature, not a setting
Users are underage athletes. Build every feature with that lens:
- **All coach ↔ athlete contact is gated through parents.** No unsupervised minor↔coach messaging.
- Parental consent, moderation, and COPPA/FERPA compliance are first-class (see `parents`, `parent_child_relations`, `compliance-*` in `server/`).
- Never expose a minor's data, contact info, or media without auth + the right relationship.
- When touching messaging, profiles, or media: assume a safeguarding review.

## Quality bar
Ship work that looks **hand-crafted, not AI-generated** — polished, on-brand (dark UI, orange accent), real copy, no placeholder/lorem, no generic template feel. Functional *and* engaging. There's a near-term demo; that's the standard.

## Commands
```bash
# Server (cd server/)
npm run dev:core      # lean API on :4000 (Node + Postgres only) — use this locally
npm run dev           # full "enterprise" server (needs Azure; crashes locally)
npm start             # prod: runs core-server.ts
npm run db:setup      # drizzle-kit push + seed (schema + sample data)
npx tsc --noEmit      # typecheck (CI runs this)

# Client (cd client/)
npm run dev           # Vite on :5173, proxies /api -> :4000
npm run build
npm run lint          # eslint — UNUSED IMPORTS ARE ERRORS, they block CI
```

## Two server entrypoints (read this first)
- **`core-server.ts`** — lean REST API, boots on just Node + Postgres. This is what deploys and what you run locally.
- **`index.ts`** — "enterprise" build with Azure Cosmos / Service Bus / a 2nd compliance server on :4001. Crashes on boot without real Azure config. Don't use for local or deploy.

## Product surface (the endpoints that matter)
- **Auth** — `/api/auth` (register, login, google), JWT Bearer. `auth.ts` exports `requireAuth`, `requireAdmin`, `AuthenticatedRequest`.
- **Athletes & profiles** — `/api/players`, `/api/profile`, `/api/athletes`, `/api/rankings`.
- **Community / reels** — `/api/posts`, `/api/stories`, player highlights (the short-form content).
- **Coach side (gated)** — `/api/coach/*` (search, board, analytics, roster).
- **Messaging (safety-sensitive)** — `/api/messages`.
- **Payments** — `/api/payments` (Stripe, wired), `/api/subscription-plans`, `/api/player-subscription`.
- **Training / AI** — `/api/training`, `/api/bot`, `/api/nil`.

## Gotchas (these cost real time)
- **`@ts-nocheck` is on most server files.** CI's `tsc --noEmit` passes but the pragma hides real runtime bugs (bad imports, string-vs-number). **Always actually run the server** — tsc won't catch them.
- **`.env` is at repo root, but the server runs from `server/`** so dotenv misses it. Use `DOTENV_CONFIG_PATH=<abs>/.env`, or `core-server` (has a localhost DB fallback).
- Root `.env` has **placeholder Azure values that crash `index.ts`** — another reason to use `core-server`.
- **Coach API is `/api/coach`**, not `/coach` (that collides with the client's `/coach/*` page routes).
- DB: local Postgres `postgres://localhost:5432/hers365`.

## Deploy
- **Backend → Railway** (project `hers365-api`): `core-server.ts` via `server/Dockerfile`, URL `https://hers365-api-production.up.railway.app`, Postgres add-on. Redeploy: `cd server && railway up`.
- **Frontend → Vercel** (static SPA): `client/vercel.json` rewrites `/api/*` → the Railway URL, else → `index.html`. Push to `main` auto-deploys.
- `main` is protected (PR + CI). Required checks: "Client — build + lint", "Server — TypeScript check".

## Code conventions
- Strip `passwordHash` from any player response (`stripPlayer` in routes.ts).
- Enforce paywalls/limits at the DB (`LIMIT`), not by slicing already-fetched rows.
- `isNaN` guard after `parseInt` on route params; wrap handlers in try/catch.
- No dead code, no placeholder copy, no commented-out blocks left in PRs.
