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
cp ../.env.example .env       # fill in your values (see below)
npm run db:migrate            # apply tracked schema migrations
npm run seed                  # seed dev data
npm run dev                   # starts on :4000
```

**Client** (new terminal)
```bash
cd client
npm install
npm run dev                   # starts on :5173
```

App is live at `http://localhost:5173`

---

## Minimum env vars to run locally

Create `server/.env`:

```
DATABASE_URL=postgres://localhost:5432/hers365
JWT_SECRET=any-random-string-32-chars-min
SESSION_SECRET=another-random-string
STRIPE_SECRET_KEY=sk_test_...       # from dashboard.stripe.com
STRIPE_WEBHOOK_SECRET=whsec_...     # from Stripe CLI: stripe listen
STRIPE_PRO_PRICE_ID=price_...       # create a product in Stripe dashboard
```

OAuth (Google/GitHub) is optional for local dev — email/password auth works without it.

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
| DB changes | Edit `server/schema.ts`, then `npm run db:generate` to create a migration, commit the new file under `server/migrations/`, and `npm run db:migrate` to apply it. Don't use `db:push` outside throwaway local prototyping — it alters the DB without a tracked, reversible migration. |
| Toast notifications | Use `useNotifications()` hook — never use `alert()` |
| Stub pages | `<UnderConstruction />` = needs to be built. Issue exists for it. |
| Tier check | Wrap premium routes with `requireTier('pro')` middleware |
| Error format | All API errors return `{ error: string, code: number }` |

---

## Contacts

Questions → ping Samuel in the team channel. Issues are the source of truth for what needs building.
