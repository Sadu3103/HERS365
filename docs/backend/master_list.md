# Master List: Routes & Database Schema

This document serves as the "source of truth" for the H.E.R.S.365 backend entities and available API endpoints.

## 📊 Database Tables (Drizzle Schema)

| Table | Description | Key Fields |
| :--- | :--- | :--- |
| **players** | Athlete profiles, subscription status, NIL points. | `email`, `position`, `subscription_tier`, `nil_points` |
| **coaches** | College coach profiles and recruiting preferences. | `university`, `division`, `recruiting_positions` |
| **parents** | Parent accounts linked to athlete profiles. | `email`, `phone` |
| **payments** | Ledger of all transactions (Stripe integration). | `amount`, `status`, `stripe_payment_intent_id` |
| **posts** | Athlete social feed content (videos/images). | `media_url`, `media_type`, `likes`, `comments` |
| **stories** | Short-lived visual content (disappears after 24h). | `image_url`, `expires_at` |
| **nil_opportunities** | Brand deals and financial opportunities for athletes. | `brand_name`, `estimated_earnings`, `requirements` |
| **scholarships** | Database of available scholarships. | `name`, `amount`, `deadline` |
| **ai_bots** | Personalized AI agents for athletes. | `bot_name`, `personality` |

---

## 🛣️ API Routes Registry

### 🔐 Authentication (`/auth`)
- `POST /auth/athlete/login`: Authenticate athlete and return JWT.
- `POST /auth/coach/register`: Register a new coach account.
- `GET /auth/me`: Verify token and return current user context.

### 🏈 Athlete & Sports Data (`/api`)
- `GET /api/players`: List all athletes.
- `GET /api/players/:id/stats`: Fetch game statistics for a specific player.
- `GET /api/maxpreps/player`: Search MaxPreps for verified athlete stats.
- `GET /api/maxpreps/leaders`: Fetch regional/national stat leaders.

### 💳 Payments (`/payments`)
- `POST /payments/create-intent`: Initialize a Stripe payment session.
- `POST /payments/webhook`: Handle asynchronous payment notifications from Stripe.

### 🤖 AI Features (`/api`)
- `POST /api/bot/:botId/chat`: Interact with a personal AI bot.
- `POST /api/nil/chat`: Ask questions specifically about NIL opportunities.
- `POST /api/training-plans`: Generate an AI-powered custom training schedule.

### 🎓 Scholarships (`/scholarships`)
- `GET /scholarships`: List all available scholarships.
- `POST /scholarships/save`: Save a scholarship to an athlete's profile.
