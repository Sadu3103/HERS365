# HERS365 — 4-Dev Workstream Blueprint

**Repo:** `https://github.com/Sadu3103/HERS365`
**Stack:** React 19 + Vite + TypeScript + TailwindCSS (client) | Express + TypeScript + Drizzle ORM + Postgres (server)
**Design system:** coral/surface/ink palette — `client/tailwind.config.js`
**Auth:** JWT Bearer — `POST /api/auth/login` → `Authorization: Bearer <token>`
**Issues tracker:** `https://github.com/Sadu3103/HERS365/issues`
**Onboarding:** See `CONTRIBUTING.md` at repo root — setup is ~5 min

---

## Cold-Start Setup (every dev, every session)

```bash
git clone https://github.com/Sadu3103/HERS365.git
cd HERS365
# Server
cd server && npm install && cp .env.example .env   # fill DATABASE_URL, JWT_SECRET, SESSION_SECRET
npx drizzle-kit push && npm run dev                # :4000
# Client (new terminal)
cd client && npm install && npm run dev            # :5173
```

> **Note:** `.env.example` is in `server/` — copy it from there, not from the repo root.

**Minimum .env:**
```
DATABASE_URL=postgres://localhost:5432/hers365
JWT_SECRET=any-32-char-string
SESSION_SECRET=any-32-char-string
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

**Payment route base:** `/api/payment` (singular) — `server/index.ts` mounts at `app.use('/api/payment', paymentRouter)`
**Nav component:** `client/src/components/Layout.tsx`
**Branch naming:** `feat/F-XX-short-name` or `fix/B-XX-short-name`
**PR title format:** `feat(F-01): description` or `fix(B-17): description`
**PR target:** `main`
**Error format:** All API errors return `{ error: string, code: number }`
**Toasts:** Use `useNotifications()` hook — never `alert()`
**DB changes:** Edit `server/schema.ts` → `npx drizzle-kit push`
**Premium routes:** Wrap with `requireTier('pro')` middleware

---

## Workstream A — Security & Infrastructure
**Owner:** Dev 1
**Focus:** Fix all critical security holes, harden the backend, add CI
**Parallel-safe:** All steps are backend-only, no conflict with other workstreams

### Step A-1 — Verify & close #1 and #2 (JWT + bcrypt already shipped)
> **Context:** `emailAuthRoutes.ts` was added to `server/` — it has bcrypt (12 rounds) and JWT (7d). Verify it's mounted in `server/index.ts` and working end-to-end.
- Check `server/index.ts` — confirm `emailAuthRoutes` is imported and mounted at `/api/auth`
- If not mounted, add: `import emailAuthRoutes from './emailAuthRoutes'; app.use('/api/auth', emailAuthRoutes);`
- Test: `curl -X POST http://localhost:4000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"test@x.com","password":"test1234","name":"Test"}'` — expect `{ token: "..." }`
- Test: `curl -X POST http://localhost:4000/api/auth/login -d '{"email":"test@x.com","password":"test1234"}'` — expect `{ token: "..." }`
- Close GitHub issues #1 and #2 with: `gh issue close 1 2 --comment "Fixed in emailAuthRoutes.ts"`

**Exit criteria:** Register + login return JWT tokens. #1 and #2 closed.

---

### Step A-2 — Fix CORS (Issue #35)
> **Context:** `server/index.ts` has a hardcoded CORS origin. Should read from `CORS_ORIGIN` env var with a safe default.
- File: `server/index.ts`
- Find the `cors()` call (or add it if missing)
- Replace hardcoded origin with: `origin: process.env.CORS_ORIGIN || 'http://localhost:5173'`
- Add to `.env.example`: `CORS_ORIGIN=https://your-frontend-domain.com`
- Test: Start server, check that `OPTIONS /api/auth/login` from localhost:5173 succeeds

**Branch:** `fix/B-17-cors-env`
**Exit criteria:** CORS reads from env. `curl -H "Origin: http://localhost:5173" -I http://localhost:4000/api/health` returns `Access-Control-Allow-Origin: http://localhost:5173`

---

### Step A-3 — Security headers with helmet.js (Issue #38)
> **Context:** `server/security.ts` may have partial security config. Add helmet.js to the Express app.
- `cd server && npm install helmet`
- File: `server/index.ts` — add near top after `express()`:
  ```ts
  import helmet from 'helmet';
  app.use(helmet());
  ```
- Test: `curl -I http://localhost:4000/api/health` — response should include `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`

**Branch:** `fix/B-20-security-headers`
**Exit criteria:** Helmet headers present on every response.

---

### Step A-4 — Auth rate limiting (Issue #37)
> **Context:** The login endpoint has no rate limiting — brute-force risk.
- `cd server && npm install express-rate-limit`
- File: `server/emailAuthRoutes.ts`
  ```ts
  import rateLimit from 'express-rate-limit';
  const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: 'Too many attempts', code: 429 } });
  router.post('/login', loginLimiter, async (req, res) => { ... });
  ```
- Apply same limiter to `/register` with `max: 5`
- Test: Send 11 rapid POST /api/auth/login requests — 11th should return 429

**Branch:** `fix/B-19-auth-rate-limit`
**Exit criteria:** 429 after 10 login attempts within 15 minutes.

---

### Step A-5 — Env var validation at startup (Issue #49)
> **Context:** Missing required env vars (DATABASE_URL, JWT_SECRET) cause cryptic runtime errors. Validate at startup and crash fast with a clear message.
- File: `server/index.ts` — add near the top after `dotenv.config()`:
  ```ts
  const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'];
  const missing = REQUIRED_ENV.filter(k => !process.env[k]);
  if (missing.length) { console.error(`Missing env vars: ${missing.join(', ')}`); process.exit(1); }
  ```
- Test: Remove `JWT_SECRET` from `.env`, restart server — should print clear error and exit

**Branch:** `feat/D-02-env-validation`
**Exit criteria:** Server exits with helpful message when required env vars are absent.

---

### Step A-6 — Zod input validation middleware (Issue #45)
> **Context:** POST/PUT routes accept arbitrary JSON. Add zod validation to auth routes as the pattern, then apply to athlete and coach routes.
- `cd server && npm install zod`
- File: `server/emailAuthRoutes.ts` — add zod schemas:
  ```ts
  import { z } from 'zod';
  const registerSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1) });
  const loginSchema = z.object({ email: z.string().email(), password: z.string() });
  ```
  In each handler: `const parsed = registerSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.message, code: 400 });`
- Create `server/middleware/validate.ts`:
  ```ts
  import { ZodSchema } from 'zod';
  export const validate = (schema: ZodSchema) => (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) return res.status(400).json({ error: r.error.flatten(), code: 400 });
    req.body = r.data; next();
  };
  ```
- Apply `validate(schema)` as middleware on the two auth routes

**Branch:** `feat/B-27-zod-validation`
**Exit criteria:** `POST /api/auth/register` with `{}` body returns 400 with field-level errors.

---

### Step A-7 — Password reset flow (Issue #36)
> **Context:** `server/email.ts` has email-sending logic. Build forgot-password + reset-token flow.
- Read `server/email.ts` to understand the send function signature
- File: `server/schema.ts` — add a `passwordResetTokens` table (userId, token, expiresAt)
- File: `server/emailAuthRoutes.ts` — add two routes:
  - `POST /api/auth/forgot-password` — generate 32-char token, store with 1h expiry, send email via `email.ts`
  - `POST /api/auth/reset-password` — verify token not expired, bcrypt new password, delete token
- Add to `.env.example`: `EMAIL_FROM=noreply@hers365.com`, `SMTP_HOST=`, `SMTP_PORT=`, `SMTP_USER=`, `SMTP_PASS=`
- Test: POST /api/auth/forgot-password with known email — check token created in DB

**Branch:** `feat/B-18-password-reset`
**Exit criteria:** Token created on forgot-password, password updated on reset, expired tokens rejected.

---

### Step A-8 — GitHub Actions CI (Issue #48)
> **Context:** No CI currently. Add a basic lint + build check that runs on every PR.
- Create `.github/workflows/ci.yml`:
  ```yaml
  name: CI
  on: [pull_request]
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20' }
        - run: cd server && npm ci && npm run build
        - run: cd client && npm ci && npm run build
  ```
- Test: Open a test PR — CI should run and pass

**Branch:** `feat/D-01-github-actions-ci`
**Exit criteria:** Green CI badge on every PR.

---

## Workstream B — Core Backend APIs
**Owner:** Dev 2
**Focus:** Build all missing REST endpoints that frontend pages depend on
**Parallel-safe:** Backend only. No conflict with Workstream A (different files) or C/D (they can mock until APIs land)

### Step B-1 — Health check endpoint (Issue #46)
> **Context:** `server/index.ts` line 142 has a `/health` route but it may be checking Cosmos DB which isn't used. Add a clean `/api/health` endpoint.
- File: `server/index.ts` — add (or replace the existing heavy health check):
  ```ts
  app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));
  ```
- Test: `curl http://localhost:4000/api/health` → `{"status":"ok",...}`

**Branch:** `feat/B-28-health-endpoint`
**Exit criteria:** GET /api/health returns 200 with `{"status":"ok"}`.

---

### Step B-2 — Athlete profile CRUD (Issue #19)
> **Context:** `server/schema.ts` has a `players` table. Build the read and update routes.
- Check `server/schema.ts` for the `players` table columns
- File: `server/api/athleteRoutes.ts` (create new file)
  ```ts
  GET /api/athletes/:id   — select from players where id = :id
  PUT /api/athletes/:id   — update players set ... where id = :id (requireAuth middleware)
  ```
- Mount in `server/index.ts`: `import athleteRoutes from './api/athleteRoutes'; app.use('/api', athleteRoutes);`
- Import `requireAuth` from `server/middleware/requireAuth.ts` and protect PUT

**Branch:** `feat/B-16-athlete-profile-crud`
**Exit criteria:** GET /api/athletes/1 returns athlete JSON. PUT with bad token returns 401.

---

### Step B-3 — Highlight reels endpoints (Issue #14)
> **Context:** `server/schema.ts` has a `highlightReels` or `reels` table. Build the three endpoints the Reels page needs.
- Check `server/schema.ts` for the reels-related table name and columns
- File: `server/api/reelsRoutes.ts`:
  ```
  GET  /api/reels?athleteId=:id   — fetch reels for athlete
  POST /api/reels                 — create reel (requireAuth)
  DELETE /api/reels/:id           — delete reel (requireAuth, must own)
  ```
- Mount in `server/index.ts`

**Branch:** `feat/B-15-highlight-reels-api`
**Exit criteria:** POST creates a reel row, GET returns it, DELETE removes it. 401 on protected routes without token.

---

### Step B-4 — Coach profile CRUD (Issue #39)
> **Context:** `server/coachRoutes.ts` may exist with partial implementation. Check and complete.
- Read `server/coachRoutes.ts` — see what's there
- Ensure these exist and work:
  ```
  GET /api/coaches/:id    — fetch coach by id
  PUT /api/coaches/:id    — update coach profile (requireAuth)
  ```
- Mount if not already mounted

**Branch:** `feat/B-21-coach-profile-crud`
**Exit criteria:** GET /api/coaches/1 returns coach JSON with school, sport, division.

---

### Step B-5 — Feed / posts API (Issue #41)
> **Context:** Build social feed CRUD. Feed.tsx already exists on the frontend but is driven by mock data.
- Check `server/schema.ts` for a posts/feed table — if none, add one: `posts(id serial PK, authorId int, content text, sport text, createdAt timestamp)`
- `npx drizzle-kit push` after schema change
- File: `server/api/feedRoutes.ts`:
  ```
  GET  /api/posts?sport=:sport&limit=20&offset=0
  POST /api/posts              (requireAuth)
  DELETE /api/posts/:id        (requireAuth, must own)
  ```

**Branch:** `feat/B-23-feed-api`
**Exit criteria:** POST creates a post, GET returns paginated list.

---

### Step B-6 — Coach-athlete bookmarking (Issue #40)
> **Context:** Coaches need to shortlist athletes. Adds a join table.
- Add to `server/schema.ts`: `coachBookmarks(id serial PK, coachId int, athleteId int, createdAt timestamp)` with unique(coachId, athleteId)
- `npx drizzle-kit push`
- File: `server/api/bookmarkRoutes.ts`:
  ```
  GET    /api/coaches/:id/bookmarks   (requireAuth)
  POST   /api/coaches/:id/bookmarks   { athleteId }
  DELETE /api/coaches/:id/bookmarks/:athleteId
  ```

**Branch:** `feat/B-22-coach-bookmarks`
**Exit criteria:** Coach can add/remove athlete bookmarks. Duplicate add is idempotent (upsert or 409).

---

### Step B-7 — Subscription tier enforcement (Issue #43)
> **Context:** `server/middleware/requireTier.ts` is referenced in CONTRIBUTING.md. Build it if missing.
- Check if `server/middleware/requireTier.ts` exists
- If not, create it:
  ```ts
  export const requireTier = (tier: 'pro' | 'enterprise') => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized', code: 401 });
    if (req.user.subscriptionTier !== tier) return res.status(403).json({ error: 'Upgrade required', code: 403 });
    next();
  };
  ```
- Apply `requireTier('pro')` to any route that should be premium (e.g., coach bookmarking, highlight upload)
- Note: `req.user` is set by `requireAuth` middleware — must run `requireAuth` first in middleware chain

**Branch:** `feat/B-25-subscription-tier`
**Exit criteria:** Free-tier user hits a pro route → 403. Pro user → 200.

---

### Step B-8 — Athlete verification admin endpoint (Issue #47)
> **Context:** Admins need to mark athlete profiles as verified.
- File: `server/api/athleteRoutes.ts` (add to existing file from Step B-2):
  ```
  PATCH /api/admin/athletes/:id/verify   (requireAuth + check req.user.role === 'admin')
  ```
  Sets `players.verified = true` in DB

**Branch:** `feat/B-29-athlete-verification`
**Exit criteria:** Admin PATCH verifies athlete. Non-admin gets 403.

---

### Step B-9 — In-app notification system (Issue #42)
> **Context:** `NotificationContext.tsx` on the frontend handles toast display. This is the storage layer.
- Add to `server/schema.ts`: `notifications(id serial PK, userId int, message text, read boolean default false, createdAt timestamp)`
- `npx drizzle-kit push`
- File: `server/api/notificationRoutes.ts`:
  ```
  GET   /api/notifications          (requireAuth) — fetch unread for req.user
  PATCH /api/notifications/:id/read (requireAuth) — mark read
  ```

**Branch:** `feat/B-24-notification-api`
**Exit criteria:** Notifications created, fetched, and marked read via API.

---

### Step B-10 — S3 photo upload presigned URLs (Issue #50)
> **Context:** Athlete profiles need photos. Use S3 presigned URLs — client uploads directly to S3, only stores URL in DB.
- `cd server && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
- Add to `.env.example`: `AWS_REGION=`, `AWS_ACCESS_KEY_ID=`, `AWS_SECRET_ACCESS_KEY=`, `S3_BUCKET=`
- File: `server/api/uploadRoutes.ts`:
  ```
  POST /api/upload/photo-url   (requireAuth) — returns { url: presignedPutUrl, key: s3Key }
  ```
  Client PUTs directly to that URL, then saves the public URL to their profile via PUT /api/athletes/:id

**Branch:** `feat/D-03-photo-upload`
**Exit criteria:** POST /api/upload/photo-url returns a presigned S3 URL that accepts a PUT from the client.

---

## Workstream C — High-Priority Frontend
**Owner:** Dev 3
**Focus:** Fix broken payment flow, build key athlete-facing pages
**Dependencies:** Steps C-6 and C-7 block on B-3 and B-4 respectively — can build UI with mock data first, wire API later

### Step C-1 — Fix Stripe checkout redirect (Issue #3)
> **Context:** `client/src/pages/Subscription.tsx` has a checkout button. `server/paymentRoutes.ts` has the Stripe session creation. The redirect to Stripe's hosted checkout is broken.
- Read `server/paymentRoutes.ts` — find `POST /api/payment/create-checkout-session`
- Read `client/src/pages/Subscription.tsx` — find the checkout button handler
- Common issue: `window.location.href = session.url` where `session.url` is undefined because the server isn't returning it correctly
- Fix: ensure server returns `res.json({ url: session.url })` and client does `window.location.href = data.url`
- Test: Click upgrade button in browser — should redirect to Stripe checkout

**Branch:** `fix/B-07-stripe-checkout`
**Exit criteria:** Clicking upgrade redirects to Stripe hosted checkout page.

---

### Step C-2 — Wire Stripe webhook (Issue #4)
> **Context:** `server/paymentRoutes.ts` has webhook handler scaffolding but it's likely not correctly reading `checkout.session.completed` events to upgrade users.
- Read `server/paymentRoutes.ts` — find the webhook handler
- Ensure: raw body parsing (`express.raw({ type: 'application/json' })`) is on the webhook route BEFORE `express.json()` is applied globally
- Handle `checkout.session.completed` event: find customer by `session.customer_email`, update `players.subscriptionTier = 'pro'`
- Test: Use Stripe CLI: `stripe listen --forward-to localhost:4000/api/payment/webhook` then `stripe trigger checkout.session.completed`

**Branch:** `fix/B-08-stripe-webhook`
**Exit criteria:** `stripe trigger checkout.session.completed` updates subscription tier in DB.

---

### Step C-3 — Mobile navigation (Issue #54)
> **Context:** The main nav has no hamburger menu for mobile. All nav links disappear below 768px.
- File: `client/src/components/Layout.tsx` — this is the main navbar/layout wrapper
- Add hamburger state: `const [menuOpen, setMenuOpen] = useState(false)`
- On `<768px`: show hamburger icon (Lucide `Menu`), hide normal nav links, show slide-down menu when open
- Use Tailwind: `hidden md:flex` for desktop links, `flex md:hidden` for hamburger button
- Add `AnimatePresence` from Framer Motion on the mobile menu panel

**Branch:** `feat/F-21-mobile-nav`
**Exit criteria:** At 375px width, hamburger appears. Tapping opens a full-width nav panel.

---

### Step C-4 — Fix Recruiting page filters (Issue #52)
> **Context:** `client/src/pages/Recruiting.tsx` — location, graduation year, and division filters don't work correctly.
- Read `client/src/pages/Recruiting.tsx`
- Find the filter state and the filtered athlete list derivation
- Common issue: filters aren't applied in `useMemo`/derived list, or the filter values don't match the data field names
- Fix the derived filtered list to apply all three filters in AND logic

**Branch:** `fix/F-19-recruiting-filters`
**Exit criteria:** Selecting "Division I" shows only D1 athletes. Combined filters work correctly.

---

### Step C-5 — Athlete onboarding flow (Issue #18)
> **Context:** After registration, athletes have no guided setup. Build a multi-step form that collects profile data.
- File: `client/src/pages/Onboarding.tsx` (create new file)
- Steps: 1) Sport + position, 2) School + graduation year, 3) Stats + achievements, 4) Photo upload prompt
- Use `useState` for `step` (1–4) and form data accumulation
- On step 4 completion: `PUT /api/athletes/:id` with the collected data, then `navigate('/profile')`
- Add route in `client/src/App.tsx` (or router file): `/onboarding`
- Redirect new users here after registration (check `emailAuthRoutes.ts` register response)

**Branch:** `feat/F-05-athlete-onboarding`
**Exit criteria:** Multi-step form completes and saves to profile. Progress indicator shows current step.

---

### Step C-6 — Highlight Reels page (Issue #13)
> **Context:** `client/src/pages/Reels.tsx` is a stub. Build the video upload + playback UI. Uses `/api/reels` from Workstream B Step B-3 (can mock with static data if B-3 isn't done yet).
- Read current `client/src/pages/Reels.tsx`
- Build: video grid with thumbnails, click-to-play modal (use `<video>` tag), upload button that POSTs to `/api/reels`
- Use coral/surface/ink palette — no old brand tokens
- Mock data shape: `{ id, title, thumbnailUrl, videoUrl, athleteId, sport, views }`
- Loading skeleton while fetching (use `useState<'loading'|'loaded'|'error'>`)

**Branch:** `feat/F-01-highlight-reels-page`
**Exit criteria:** Page shows reel grid, click plays video in modal, upload button is visible.

---

### Step C-7 — Subscription page (Issue #33)
> **Context:** `client/src/pages/Subscription.tsx` needs to show the two tiers and trigger Stripe checkout. Depends on C-1 being done first.
- Read `client/src/pages/Subscription.tsx`
- Build: two pricing cards (Free vs Pro), feature bullet lists, "Upgrade to Pro" CTA button
- CTA calls `POST /api/payment/create-checkout-session` then redirects to `data.url`
- Use `STRIPE_PRO_PRICE_ID` on server side (already wired in paymentRoutes.ts)

**Branch:** `feat/F-16-subscription-page`
**Exit criteria:** Two pricing cards visible. Clicking upgrade redirects to Stripe hosted checkout.

---

### Step C-8 — Loading skeletons (Issue #51)
> **Context:** Pages that fetch data show nothing while loading. Add skeleton loaders to the main data-fetching pages.
- Pages to update: `Rankings.tsx`, `Recruiting.tsx`, `Feed.tsx`, `Reels.tsx`, `Profile.tsx`
- Pattern: `if (loading) return <SkeletonGrid />` — create a reusable `client/src/components/SkeletonCard.tsx`
- SkeletonCard: gray pulsing blocks using `animate-pulse bg-surface-card rounded-xl`
- Replace each page's initial null/empty state with skeleton cards matching the real layout

**Branch:** `feat/F-18-loading-skeletons`
**Exit criteria:** Each listed page shows 3–6 skeleton cards while data loads.

---

### Step C-9 — Settings page (Issue #32)
> **Context:** `client/src/pages/Settings.tsx` exists but may be partially built. Complete it with real API calls.
- Read current `Settings.tsx`
- Sections to implement: Account info (reads from `/api/athletes/:id`), Password change (POST `/api/auth/change-password`), Notification preferences (state only — no backend needed yet)
- Each section should have a Save button with loading state and toast on success

**Branch:** `feat/F-15-settings-page`
**Exit criteria:** Account info loads from API, password change form submits and shows success toast.

---

### Step C-10 — Notification bell (Issue #55)
> **Context:** In-app notification center in nav bar. Reads from `/api/notifications` (Workstream B Step B-9). Can mock with static notifications if B-9 isn't done yet.
- Find the navbar component
- Add bell icon (Lucide `Bell`) with unread count badge
- Click opens a dropdown with notification list
- Each notification has mark-as-read button — calls `PATCH /api/notifications/:id/read`
- Poll every 30s: `useEffect(() => { const t = setInterval(fetchNotifs, 30000); return () => clearInterval(t); }, [])`

**Branch:** `feat/F-22-notification-bell`
**Exit criteria:** Bell shows unread count. Clicking opens dropdown. Mark-read removes badge.

---

## Workstream D — Content Pages & DevOps
**Owner:** Dev 4
**Focus:** Build all stub page content + CI setup
**Parallel-safe:** Entirely frontend page work. No conflicts with other workstreams.

### Step D-1 — Custom 404 page (Issue #57)
> **Context:** Unknown routes likely hit a blank screen. Build a branded not-found page.
- File: `client/src/pages/NotFound.tsx` (does not exist — create it)
- Build: Large "404" in coral, headline, subtext, "Go Home" button → `navigate('/')`
- Register in router: add catch-all `<Route path="*" element={<NotFound />} />`

**Branch:** `feat/F-24-404-page`
**Exit criteria:** `localhost:5173/bad-url` shows the 404 page with home navigation.

---

### Step D-2 — Scholarship Tracker page (Issue #15)
> **Context:** `client/src/pages/ScholarshipTracker.tsx` is a stub (`<UnderConstruction />`).
- Build: Table of scholarship opportunities (name, school, division, deadline, amount, sport)
- Filter by sport and division
- "Add Scholarship" form (client-side state only — no API needed yet)
- Use `server/scholarshipRoutes.ts` if it has data — otherwise seed 6–8 mock scholarships

**Branch:** `feat/F-02-scholarship-tracker`
**Exit criteria:** Page renders a filterable scholarship table with mock data.

---

### Step D-3 — Events page (Issue #16)
> **Context:** `client/src/pages/Events.tsx` is a stub. `server/eventRoutes.ts` may have data.
- Check `server/eventRoutes.ts` for a GET /api/events endpoint
- Build: Event cards grid (name, date, location, sport, type: camp/combine/tournament)
- Filter by type and sport
- Click card → expand with details and "Register Interest" button

**Branch:** `feat/F-03-events-page`
**Exit criteria:** Events grid renders. Filter by sport works.

---

### Step D-4 — NIL page (Issue #17)
> **Context:** `client/src/pages/NIL.tsx` is a stub.
- Build: NIL opportunity cards (brand name, deal type, compensation range, sport, eligibility)
- "Express Interest" button shows a modal with email pre-filled
- 6–8 mock NIL deals as seed data in the component

**Branch:** `feat/F-04-nil-page`
**Exit criteria:** NIL cards visible. Express Interest modal opens with email form.

---

### Step D-5 — Explore page (Issue #25)
> **Context:** `client/src/pages/Explore.tsx` is a stub. This is athlete discovery with search + filters.
- Build: Search bar + filters (sport, position, state, graduation year)
- Athlete cards grid — call `GET /api/athletes` if available, else mock 8–10 athletes
- Each card: name, sport, school, position, photo placeholder, "View Profile" link

**Branch:** `feat/F-08-explore-page`
**Exit criteria:** Athlete search returns filtered results. Cards link to profiles.

---

### Step D-6 — Video Studio page (Issue #26)
> **Context:** `client/src/pages/VideoStudio.tsx` is a stub.
- Build: Highlight clip editor UI (no actual video editing — this is the upload + trim metadata interface)
- Sections: Upload clip, Add title/description, Tag sport + position, Preview thumbnail, Publish button
- On Publish: POST to `/api/reels` (mock if API not available)

**Branch:** `feat/F-09-video-studio`
**Exit criteria:** Upload form renders. Publish button creates a reel entry (mock or real).

---

### Step D-7 — Finder pages (Issues #27, #28, #29)
> **Context:** Three related "finder" pages are stubs: LeagueFinder, TeamFinder, SquadFinder. Build all three in one PR since they share a layout pattern.
- Build a shared `FinderCard` component: `client/src/components/FinderCard.tsx`
- `LeagueFinder.tsx`: league list filtered by state + sport
- `TeamFinder.tsx`: team list filtered by division + sport, includes roster size
- `SquadFinder.tsx`: 7v7 squad list filtered by state + skill level
- All use mock data — 6–8 entries each

**Branch:** `feat/F-10-11-12-finder-pages`
**Exit criteria:** All three pages render filterable cards. Shared FinderCard component reused.

---

### Step D-8 — Parent Hub (Issue #20)
> **Context:** `client/src/pages/ParentHub.tsx` is a stub.
- Build: Parent view showing linked athlete's stats, upcoming events, scholarship opportunities
- Mock athlete data — link to athlete ID stored in localStorage
- Sections: Profile summary, Recent activity feed, Upcoming deadlines

**Branch:** `feat/F-06-parent-hub`
**Exit criteria:** Parent Hub renders athlete summary and activity feed.

---

### Step D-9 — College Fit Calculator (Issue #21)
> **Context:** `client/src/pages/CollegeFitCalculator.tsx` is a stub.
- Build: Multi-question form (GPA, sport, position, preferred division, state preference, scholarship need)
- On submit: score each college from a mock list of 8–10 colleges against the inputs
- Display ranked results with match percentage

**Branch:** `feat/F-07-college-fit-calc`
**Exit criteria:** Form submission returns a ranked list of college matches with fit scores.

---

### Step D-10 — Staff Dashboard (Issue #30) + College Flag Football (Issue #31)
> **Context:** Both are stubs. Build in one PR.
- `StaffDashboard.tsx`: Admin stats (total athletes, active coaches, signups this week) + recent signups table
- `CollegeFlagFootball.tsx`: College program directory — list of schools with flag football programs, filter by state/division
- Both use mock data

**Branch:** `feat/F-13-14-staff-cfb`
**Exit criteria:** Staff Dashboard shows stats cards and table. CFB page shows filterable program directory.

---

### Step D-11 — MaxPreps lookup + Profile sharing (Issues #53, #56)
> **Context:** `server/maxpreps.ts` may have integration code. Profile sharing is a simple copy-link feature.
- `MaxPrepsLookup.tsx`: Search form (athlete name + school) → check `server/maxpreps.ts` for API call pattern → display returned stats or "no results"
- `Profile.tsx` (add sharing): "Share Profile" button copies `window.location.href` to clipboard + shows Twitter/Instagram share links with pre-filled text

**Branch:** `feat/F-20-23-maxpreps-sharing`
**Exit criteria:** MaxPreps search returns stats. Share button copies link and shows social share options.

---

## Cross-Workstream Dependencies

| Downstream step | Depends on | What to do if upstream isn't done |
|---|---|---|
| C-6 Reels page | B-3 Reels API | Use mock `[{id:1, title:'...',...}]` — swap fetch on merge |
| C-7 Subscription page | C-1 Stripe redirect fix | Do C-1 first in Workstream C |
| C-10 Notification bell | B-9 Notification API | Use mock notifications — swap fetch on merge |
| B-7 Subscription tier | C-1+C-2 Stripe wired | Can build middleware independently — tier check works regardless |
| B-5 Feed API | No deps | Independent |

---

## Issue Priority Order (Quick Reference)

| Priority | Workstream A | Workstream B | Workstream C | Workstream D |
|---|---|---|---|---|
| Do first | A-2 CORS fix | B-1 Health check | C-1 Stripe redirect | D-1 404 page |
| High | A-3 Helmet, A-4 Rate limit | B-2 Athlete CRUD, B-3 Reels API | C-3 Mobile nav, C-5 Onboarding | D-2 Scholarship, D-3 Events |
| Medium | A-5 Env validation, A-6 Zod | B-4 Coach CRUD, B-5 Feed API | C-4 Recruiting filters, C-6 Reels page | D-5 Explore, D-6 Video Studio |
| Low/Last | A-7 Password reset, A-8 CI | B-9 Notifications, B-10 S3 upload | C-8 Skeletons, C-9 Settings | D-7–D-11 finder pages |

---

## Notes for Devs Using Claude Code

- Each step above is self-contained — paste the step as your first message in a new Claude session
- Include the "Context" block verbatim — it tells Claude what already exists so it won't rebuild things
- Use branch names exactly as listed — it keeps the PR history clean for Samuel to review
- If you hit a blocker on an upstream step, read the "What to do if upstream isn't done" column and mock it
- Run `git pull origin main` before starting each step — other devs are merging frequently

---

*Plan generated: 2026-06-02 | Repo: Sadu3103/HERS365 | 45 open issues → 4 workstreams → ~35 PRs*
