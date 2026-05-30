# HERS365
**Girls flag football recruiting platform** — athlete profiles, verified stats, coach discovery, NCAA scholarship tools.

🌐 **Live site:** https://hers365.vercel.app

---

## What's in this repo

```
HERS365/
├── client/          ← The website (what users see)
├── server/          ← The backend (data, logic, payments)
└── .github/         ← Workflows and PR templates (don't touch)
```

---

## client/ — The Website

Built with React + TypeScript. Everything the user sees in the browser.

```
client/
├── src/
│   ├── pages/       ← Every screen in the app
│   ├── components/  ← Reusable UI pieces (Layout, Navigation)
│   └── index.css    ← Global styles and design tokens
├── index.html       ← App entry point
└── package.json     ← Dependencies
```

**Key pages:**
| File | What it is |
|------|-----------|
| `Feed.tsx` | Home screen — hero banner, stat cards, activity feed |
| `Profile.tsx` | Athlete profile page |
| `Rankings.tsx` | Top 250 leaderboard |
| `Recruiting.tsx` | Coach discovery board |
| `Messages.tsx` | Direct messaging |
| `Training.tsx` | Drills and workouts |
| `LandingPage.tsx` | Public landing page (before login) |
| `Auth.tsx` | Login and register |
| `Pricing.tsx` | Subscription tiers — Rookie / Pro / Elite |

---

## server/ — The Backend

Built with Node.js + Express + TypeScript. Handles data, auth, and payments.

```
server/
├── routes/          ← API endpoints (what the frontend calls)
├── index.ts         ← Server entry point — starts everything
├── schema.ts        ← Database table definitions
├── db.ts            ← Database connection
├── seed.ts          ← Sample data for testing
└── package.json     ← Dependencies
```

**Key endpoints:**
| Endpoint | What it does |
|----------|-------------|
| `POST /api/auth/login` | Log a user in |
| `POST /api/auth/register` | Create a new account |
| `GET /api/athletes` | Get list of athletes (with filters) |
| `GET /api/athletes/:id` | Get one athlete's full profile |
| `POST /api/stripe/checkout` | Start a subscription payment |
| `GET /api/health` | Check if server is running |

---

## Running locally

**Frontend:**
```bash
cd client && npm install && npm run dev
```
Opens at http://localhost:5173

**Backend:**
```bash
cd server && npm install && npm run dev
```
Runs at http://localhost:3001

---

## How we work

- All changes go through a **Pull Request** — no pushing directly to main
- Every PR needs **Samuel's approval** before it merges
- CI runs automatically — broken code cannot merge
- Workflow guide: see `#rules-and-workflow` in Discord

---

## Team

| Name | Role |
|------|------|
| Jonte | Owner |
| Samuel | Lead — architecture, review, shipping |
| Tory | Frontend — UI, pages, user experience |
| Irene | Backend — auth, database, payments |

**Questions?** Tag @sammy in Discord
