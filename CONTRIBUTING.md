# HERS365 — Dev Onboarding

Women's sports recruiting platform. React + Vite (client), Express + Drizzle + Postgres (server).

---

## Prerequisites

- Node 20+
- PostgreSQL running locally (`brew install postgresql@16 && brew services start postgresql@16`)
- Git access to `github.com/Sadu3103/HERS365`

---

## Setup (5 min)

```bash
git clone https://github.com/Sadu3103/HERS365.git
cd HERS365
```

**Server**
```bash
cd server
npm install
cp .env.example .env          # pre-filled with working dev defaults, no changes needed
npx drizzle-kit push          # run schema migrations
npm run db:seed               # seed dev data + create test accounts
npm run dev:core              # starts on :4000 (use this, not npm run dev)
```

**Client** (new terminal)
```bash
cd client
npm install
npm run dev                   # starts on :5173
```

App is live at `http://localhost:5173`

---

## Test accounts (created by db:seed)

All passwords are `hers365`.

| Role | Email |
|---|---|
| Athlete | maya@hers365.com |
| Athlete | jordan@hers365.com |
| Athlete | aaliyah@hers365.com |
| Coach | coach@hers365.com |

---

## Why `dev:core` not `dev`?

`npm run dev` boots the full enterprise server (Azure Cosmos, Service Bus, compliance). It crashes immediately without real Azure credentials. `npm run dev:core` boots just the REST API + Postgres — that's all you need locally.

---

## Repo structure

```
/client          React + Vite + Tailwind frontend
  /src/pages     One file per route (stubs = <UnderConstruction />)
  /src/components Shared UI components
  /src/context   NotificationContext (toasts), AuthContext

/server          Express + TypeScript API
  schema.ts      Drizzle ORM table definitions (single source of truth)
  db.ts          Postgres connection pool
  index.ts       App entry — all routers mounted here
  /middleware    requireAuth.ts, errorHandler.ts, requireTier.ts
  emailAuthRoutes.ts  Register + Login (bcrypt + JWT)
  paymentRoutes.ts    Stripe checkout + webhooks
```

---

## Picking up an issue

1. Grab an open issue from `github.com/Sadu3103/HERS365/issues`
2. Create a branch: `git checkout -b fix/B-XX-short-name` or `feat/F-XX-short-name`
3. Make your change — every issue has the target file listed
4. Push and open a PR against `main`
5. PR title format: `fix(B-10): description` or `feat(F-01): description`

---

## Key things to know

| Thing | Detail |
|---|---|
| Auth | JWT Bearer token — get one from `POST /api/auth/login`. Attach as `Authorization: Bearer <token>` |
| DB changes | Edit `server/schema.ts`, then run `npx drizzle-kit push` |
| Toast notifications | Use `useNotifications()` hook — never use `alert()` |
| Stub pages | `<UnderConstruction />` = needs to be built. Issue exists for it. |
| Tier check | Wrap premium routes with `requireTier('pro')` middleware |
| Error format | All API errors return `{ error: string, code: number }` |

---

## Contacts

Questions → ping Samuel in the team channel. Issues are the source of truth for what needs building.
