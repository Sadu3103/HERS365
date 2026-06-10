# HERS365 Backend Wiring + Inbox Design

**Date:** 2026-06-09  
**Status:** Approved

## Problem

`Auth.tsx` correctly calls `/api/auth/login` and persists `token` + `user` to localStorage, but no shared context reads those values back. Every component falls through to mock data or hardcoded strings ("Sarah Watkins"). The result: login appears to work but the app is entirely disconnected from the real database.

## Scope

Five changes, sequenced so each one unblocks the next:

1. AuthContext — shared auth state
2. Role-aware navigation — redirect and display based on real role
3. Messages backend — replace in-memory mock with real Drizzle queries
4. Inbox redesign — two-tab inbox (messages + requests)
5. Users + athletes list — wire remaining mock API routes to DB

### Out of scope
- Group chat (requires a new `conversations` table — separate spec)
- Coach vs recruiter icon distinction (requires a `coachType` column — separate spec)
- Full Settings.tsx save wiring (separate task)

---

## 1. AuthContext

**File:** `client/src/context/AuthContext.tsx`

Reads `token` and `user` from localStorage on mount. Shape of `user`:

```ts
interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'player' | 'coach' | 'parent';
  position?: string;
  gradYear?: number;
  school?: string;
}
```

Exposes: `user`, `token`, `isAuthenticated`, `login(token, user)`, `logout()`.

`logout()` clears localStorage and navigates to `/`.

`App.tsx` wraps all routes with `<AuthProvider>`.

`Auth.tsx` calls `login(data.token, data.user)` from context instead of writing localStorage directly.

---

## 2. Role-aware navigation

**File:** `client/src/components/Layout.tsx`

- Replace hardcoded "Sarah Watkins" profile card with `user.name`, `user.position`, `user.gradYear` from AuthContext.
- The ATHLETE/COACH toggle becomes a read-only role badge — it displays `user.role`, it does not switch modes.
- The Messages nav badge reads from `GET /api/messages/unread-count` instead of the hardcoded `3`.

**File:** `client/src/pages/Auth.tsx`

- After successful coach login (`user.role === 'coach'`), redirect to `/coach/dashboard` instead of `/feed`.
- After successful player login, redirect to `/feed` (existing behavior).

---

## 3. Messages backend

**File:** `server/api/messages.ts`

All routes require `requireAuth` from `./auth`. The existing `messages` table defines conversations by `(coachId, athleteId)` pairs — no new table needed.

### Routes

**GET /conversations**  
Query distinct `(coachId, athleteId)` pairs from `messages` where `coachId = req.user.id OR athleteId = req.user.id`. For each pair, fetch the partner's name from `coaches` or `players`, the last message, and the unread count (messages where `senderId != req.user.id AND read = false`).

Response shape per conversation:
```ts
{
  partnerId: number;
  partnerName: string;
  partnerRole: 'coach' | 'player';
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}
```

**GET /conversations/:partnerId/messages**  
Return paginated messages for the pair `(req.user.id, partnerId)` sorted by `createdAt` ascending. Query params: `limit` (default 50), `offset` (default 0).

**POST /**  
Body: `{ recipientId, content }`.  
Check `messageRequests` for an approved request between the pair before inserting. If no approved request exists, return 403. Insert into `messages` table with `senderId = req.user.id`, `senderType = req.user.role`, correct `coachId`/`athleteId` assignment.

**PUT /read**  
Body: `{ partnerId }`. Mark all messages in the pair where `senderId != req.user.id` as `read = true`.

**GET /unread-count**  
Return total count of messages where `(coachId = id OR athleteId = id) AND senderId != id AND read = false`.

**GET /requests**  
Return `messageRequests` rows where `athleteId = req.user.id OR coachId = req.user.id` and `status = 'pending'`. Include sender name.

**POST /requests/:requestId/respond**  
Body: `{ action: 'approve' | 'reject' }`. Update `messageRequests.status` accordingly. Only the recipient can respond.

---

## 4. Inbox redesign

**File:** `client/src/pages/Messages.tsx`

Two-panel layout (sidebar + thread view), same as current but wired to real API.

### Left panel — conversation list
- Two tabs: **INBOX** and **REQUESTS**
- INBOX tab: conversations sorted by `lastMessageAt` descending, unread sorted first. Each row: single-person DM icon, partner name, last message preview (truncated), timestamp, orange unread dot if `unreadCount > 0`.
- REQUESTS tab: pending `messageRequests` with **Accept** and **Decline** buttons. Accepting opens a new conversation.

### Right panel — thread view
- Messages from `GET /conversations/:partnerId/messages`, paginated (load more on scroll up).
- Message input at bottom, sends via `POST /`.
- On open, fires `PUT /read` to mark messages read.

### No group chat UI
Group chat is not implemented in this pass — the schema has no group/conversation table. The DM icon (single person silhouette) is used for all conversations.

---

## 5. Users + athletes list to real DB

**File:** `server/api/users.ts`

- Add `requireAuth` to all routes.
- `GET /profile`: query `players`, `coaches`, or `parents` table by `req.user.id` based on `req.user.role`. Strip `passwordHash`. Return real user data.
- `PUT /profile`: update the correct table. Use the same field whitelist as `athletes.ts`.
- `GET /stats`, `GET /achievements`: query real `players` fields.
- Remove mock `followUser` and `searchUsers` stubs — these will be real later.

**File:** `server/api/athletes.ts`

- `GET /` (list/search): replace mock array with `db.select().from(schema.players)` with `where` conditions for `position`, `state`, `gradYear`. Map DB columns to the response shape the frontend expects. Strip `passwordHash`.
- `POST /:id/favorite`: requires a `favorites` table (not in schema yet) — skip this route for now, return 501.
- `GET /:id/stats`: query real `players` row fields instead of hardcoded drill times.

---

## Data flow after this change

```
User logs in → Auth.tsx → POST /api/auth/login → JWT stored in AuthContext
     ↓
Layout reads AuthContext → shows real name, role, unread count
     ↓
/messages → GET /api/messages/conversations → real DB rows
     ↓
Conversation open → GET /api/messages/conversations/:id/messages → real messages
     ↓
/profile → GET /api/users/profile → real player/coach row
```

---

## Testing

- Log in as a player account → Layout shows real name, feed loads, messages inbox is empty (no messages yet in DB).
- Log in as a coach account → redirected to `/coach/dashboard`.
- Send a message between two test accounts → appears in inbox for recipient.
- Unread count badge on Messages nav updates after marking read.
- Athlete list at `/recruiting` shows real registered players.
