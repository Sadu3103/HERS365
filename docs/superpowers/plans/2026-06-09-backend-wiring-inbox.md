# Backend Wiring + Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the React frontend to the real Postgres/Drizzle backend so login identity flows through the app, and replace the in-memory mock message/user/athlete routes with real DB queries plus a two-tab inbox.

**Architecture:** A new `AuthContext` reads the JWT + user that `Auth.tsx` already persists to localStorage and exposes it app-wide. An `apiFetch` helper injects the `Bearer` token on every request. Backend mock routes (`messages.ts`, `users.ts`, `athletes.ts`) are rewritten to query Drizzle tables, keying message conversations by role (athlete groups by `coachId`, coach groups by `athleteId`). The `Messages.tsx` page is redesigned into INBOX + REQUESTS tabs.

**Tech Stack:** React 19 + TypeScript + Vite + TanStack Query (already installed) + lucide-react icons (frontend); Express + Drizzle ORM + Postgres (backend); JWT auth via existing `server/auth.ts`.

---

## Verification Approach (read first)

This codebase has **no test runner and no test files** — every server file carries `// @ts-nocheck` and there is no vitest/jest config. Per the user's standing instruction not to over-engineer, this plan does **not** introduce a test framework. Verification for each task is:

1. **Type/build check** — `npm run build` in the affected package (`server/` or `client/`). Must succeed.
2. **Runtime smoke check** — `curl` against a locally running server (when a dev DB is available) and/or a manual browser check on the deployed app. Exact commands are given per task.

If a future task needs unit tests, that is a separate plan.

## Known facts the implementer must not get wrong

- The JWT payload (`server/auth.ts` → `TokenPayload`) is `{ userId, email, role, name }`. **The id field is `userId`, not `id`.** Access it as `(req as any).user.userId` in route handlers.
- `UserRole` values are `'athlete' | 'coach' | 'parent' | 'admin'`. **A player's role string is `'athlete'`, never `'player'`.**
- `POST /api/auth/login` and `/register` already return `{ token, user: { id, email, name, role } }`. The frontend `user.role` for an athlete is `'athlete'`.
- The main `/auth` page logs in athletes/parents only (it sends no role, so the backend defaults to `'athlete'`). Coaches use the separate `/coach/login` portal which stores `coachToken`/`coachUser`. Do **not** try to route coaches through the main login.
- `messages` table columns: `id, coachId, athleteId, senderId, senderType ('coach'|'athlete'), content, read, createdAt`.
- `messageRequests` columns: `id, athleteId, receiverId, content, status ('pending'|'approved'|'rejected'|'sent'), parentId, createdAt, updatedAt`. There is **no** `coachId` column here — the recipient is `receiverId`.
- `db` is imported as `import { db } from '../db'` (from `server/api/*`) or `'./db'` (from `server/*`). Schema is `import * as schema from '../schema'`.
- TanStack Query's `QueryClientProvider` already wraps the app in `App.tsx`. Reuse `useQuery`/`useMutation`; do not add a new data-fetching library.

---

## File Structure

**Create:**
- `client/src/lib/api.ts` — `apiFetch` helper (token injection, JSON, error normalization)
- `client/src/context/AuthContext.tsx` — auth state provider + `useAuth` hook

**Modify:**
- `client/src/App.tsx` — wrap routes in `<AuthProvider>`
- `client/src/pages/Auth.tsx` — call `login()` from context instead of writing localStorage directly
- `client/src/components/Layout.tsx` — real identity, working COACH toggle, dynamic unread badge
- `client/src/pages/Messages.tsx` — INBOX + REQUESTS redesign wired to real API
- `server/api/messages.ts` — rewrite to real DB queries
- `server/api/users.ts` — rewrite to real DB queries
- `server/api/athletes.ts` — replace mock list endpoint with real query

---

## Task 1: API helper + AuthContext

**Files:**
- Create: `client/src/lib/api.ts`
- Create: `client/src/context/AuthContext.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/pages/Auth.tsx`

- [ ] **Step 1: Create the `apiFetch` helper**

Create `client/src/lib/api.ts`:

```ts
export interface ApiError extends Error {
  status: number;
}

// Wraps fetch: injects the Bearer token, sends/parses JSON, and throws on non-2xx.
export async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `Request failed (${res.status})`) as ApiError;
    err.status = res.status;
    throw err;
  }
  return data as T;
}
```

- [ ] **Step 2: Create AuthContext**

Create `client/src/context/AuthContext.tsx`:

```tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'athlete' | 'coach' | 'parent' | 'admin';
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Wrap the app in AuthProvider**

In `client/src/App.tsx`, add the import near the other context import:

```tsx
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
```

Then wrap `<NotificationProvider>` (which is inside `<QueryClientProvider>`) so the provider tree becomes:

```tsx
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            {/* ...unchanged Routes... */}
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
```

- [ ] **Step 4: Use `login()` from context in Auth.tsx**

In `client/src/pages/Auth.tsx`, add the import:

```tsx
import { useAuth } from '../context/AuthContext';
```

Inside the `Auth` component, add near the other hooks:

```tsx
  const { login } = useAuth();
```

Replace this block in `handleSubmit`:

```tsx
      if (data.token) localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      // New registrations go through onboarding; returning users land on the feed
      navigate(isLogin ? '/feed' : '/onboarding');
```

with:

```tsx
      if (data.token && data.user) login(data.token, data.user);
      // New registrations go through onboarding; returning users land on the feed
      navigate(isLogin ? '/feed' : '/onboarding');
```

- [ ] **Step 5: Build the client**

Run: `cd client && npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/api.ts client/src/context/AuthContext.tsx client/src/App.tsx client/src/pages/Auth.tsx
git commit -m "feat(client): add AuthContext + apiFetch, wire login flow"
```

---

## Task 2: Layout — real identity, working COACH toggle, live unread badge

**Files:**
- Modify: `client/src/components/Layout.tsx`

- [ ] **Step 1: Import context, query, and api helper**

At the top of `client/src/components/Layout.tsx`, add:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
```

- [ ] **Step 2: Read auth + fetch profile and unread count**

Inside the `Layout` component, after the existing `useState`/`useRef` hooks, add:

```tsx
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiFetch<{ success: boolean; data: any }>('/api/users/profile'),
    enabled: !!user,
  });

  const { data: unread } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => apiFetch<{ success: boolean; data: { totalUnread: number } }>('/api/messages/unread-count'),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadMessages = unread?.data?.totalUnread ?? 0;
  const p = profile?.data ?? {};
```

- [ ] **Step 3: Make the Messages nav badge dynamic**

Replace the static nav array entry. Change the `nav` constant's Messages line from:

```tsx
  { icon: MessageSquare, label: 'MESSAGES',   path: '/messages', badge: 3 },
```

to (remove the hardcoded badge — it will be injected at render):

```tsx
  { icon: MessageSquare, label: 'MESSAGES',   path: '/messages' },
```

Then in the `nav.map(...)` render, compute the badge from unread count. Replace:

```tsx
          {nav.map(({ icon: Icon, label, path, badge }) => {
            const active = location.pathname === path;
```

with:

```tsx
          {nav.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            const badge = path === '/messages' && unreadMessages > 0 ? unreadMessages : undefined;
```

- [ ] **Step 4: Make the ATHLETE/COACH toggle navigate**

Replace the toggle block (the `(['athlete', 'coach'] as const).map(...)` button group) so COACH navigates to the coach portal instead of flipping dead local state:

```tsx
        {/* ATHLETE / COACH switch */}
        <div style={{
          display: 'flex',
          background: '#161616',
          borderRadius: 9999,
          padding: 3,
          marginBottom: 32,
        }}>
          <button
            onClick={() => setMode('athlete')}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 9999,
              background: mode === 'athlete' ? '#ff5a2d' : 'transparent',
              color: mode === 'athlete' ? '#fff' : '#555',
              fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            ATHLETE
          </button>
          <button
            onClick={() => {
              const hasCoach = localStorage.getItem('coachToken');
              navigate(hasCoach ? '/coach/dashboard' : '/coach/login');
            }}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 9999,
              background: 'transparent', color: '#555',
              fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            COACH
          </button>
        </div>
```

(Keep the existing `const [mode, setMode] = useState<'athlete' | 'coach'>('athlete');` line — `mode` is still used for the ATHLETE button's active styling.)

- [ ] **Step 5: Replace hardcoded "Sarah Watkins" profile card with real data**

In the bottom profile card button, replace the `<img ... alt="Sarah Watkins" />` and the two text `<div>`s and the rating `<div>`:

```tsx
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name ?? 'Your Profile'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#555', marginTop: 1 }}>
                {[p.position, p.gradYear].filter(Boolean).join(' | ') || 'Complete your profile'}
              </div>
            </div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#ff5a2d', flexShrink: 0 }}>
              {p.g5Rating ?? '—'}
            </div>
```

And change the avatar `<img>` `alt` to `{user?.name ?? 'Profile'}` (the `src` can stay as the placeholder portrait for now — avatar uploads are out of scope).

- [ ] **Step 6: Build the client**

Run: `cd client && npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/Layout.tsx
git commit -m "feat(client): wire Layout to real user identity, live unread badge, coach toggle nav"
```

---

## Task 3: Backend messages.ts → real Drizzle queries

**Files:**
- Modify (full rewrite): `server/api/messages.ts`

- [ ] **Step 1: Replace the entire file with DB-backed routes**

Overwrite `server/api/messages.ts`:

```ts
import express from 'express';
import { and, eq, or, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../auth';

const router = express.Router();
router.use(requireAuth);

// Returns { userId, role } for the authenticated caller.
function caller(req: express.Request) {
  const u = (req as any).user;
  return { userId: Number(u.userId), role: u.role as string };
}

// GET /api/messages/conversations — one row per chat partner
router.get('/conversations', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const isCoach = role === 'coach';

    // Pull every message involving this user, newest first.
    const rows = await db
      .select()
      .from(schema.messages)
      .where(isCoach ? eq(schema.messages.coachId, userId) : eq(schema.messages.athleteId, userId))
      .orderBy(desc(schema.messages.createdAt));

    // Group by the partner id (the other side of the pair).
    const byPartner = new Map<number, { last: any; unread: number }>();
    for (const m of rows) {
      const partnerId = isCoach ? m.athleteId : m.coachId;
      if (partnerId == null) continue;
      const entry = byPartner.get(partnerId) ?? { last: m, unread: 0 };
      // rows are desc, so the first seen is the latest
      if (!byPartner.has(partnerId)) entry.last = m;
      if (!m.read && m.senderId !== userId) entry.unread += 1;
      byPartner.set(partnerId, entry);
    }

    // Resolve partner names.
    const partnerIds = [...byPartner.keys()];
    const partnerTable = isCoach ? schema.players : schema.coaches;
    const names = new Map<number, string>();
    for (const pid of partnerIds) {
      const [row] = await db.select().from(partnerTable).where(eq(partnerTable.id, pid)).limit(1);
      names.set(pid, row?.name ?? 'Unknown');
    }

    const data = partnerIds.map((pid) => {
      const { last, unread } = byPartner.get(pid)!;
      return {
        partnerId: pid,
        partnerName: names.get(pid) ?? 'Unknown',
        partnerRole: isCoach ? 'athlete' : 'coach',
        lastMessage: last.content,
        lastMessageAt: last.createdAt,
        unreadCount: unread,
      };
    });

    // unread first, then most recent
    data.sort((a, b) => {
      if ((b.unreadCount > 0 ? 1 : 0) !== (a.unreadCount > 0 ? 1 : 0)) {
        return (b.unreadCount > 0 ? 1 : 0) - (a.unreadCount > 0 ? 1 : 0);
      }
      return new Date(b.lastMessageAt as any).getTime() - new Date(a.lastMessageAt as any).getTime();
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[messages/conversations]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// GET /api/messages/conversations/:partnerId/messages — full thread, oldest first
router.get('/conversations/:partnerId/messages', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const isCoach = role === 'coach';
    const partnerId = parseInt(req.params.partnerId, 10);
    if (Number.isNaN(partnerId)) {
      return res.status(400).json({ success: false, error: 'Invalid partner id' });
    }

    const pairWhere = isCoach
      ? and(eq(schema.messages.coachId, userId), eq(schema.messages.athleteId, partnerId))
      : and(eq(schema.messages.athleteId, userId), eq(schema.messages.coachId, partnerId));

    const limit = Number(req.query.limit ?? 50);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db
      .select()
      .from(schema.messages)
      .where(pairWhere)
      .orderBy(schema.messages.createdAt)
      .limit(limit)
      .offset(offset);

    const data = rows.map((m) => ({
      id: m.id,
      content: m.content,
      isFromMe: m.senderId === userId,
      read: m.read,
      createdAt: m.createdAt,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('[messages/thread]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// POST /api/messages — send a message to a partner
router.post('/', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const isCoach = role === 'coach';
    const { partnerId, content } = req.body ?? {};

    if (!partnerId || !content) {
      return res.status(400).json({ success: false, error: 'partnerId and content are required' });
    }

    const [row] = await db
      .insert(schema.messages)
      .values({
        coachId: isCoach ? userId : Number(partnerId),
        athleteId: isCoach ? Number(partnerId) : userId,
        senderId: userId,
        senderType: isCoach ? 'coach' : 'athlete',
        content: String(content),
        read: false,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: { id: row.id, content: row.content, isFromMe: true, read: false, createdAt: row.createdAt },
    });
  } catch (err) {
    console.error('[messages/send]', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// PUT /api/messages/read — mark inbound messages in a thread as read
router.put('/read', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const isCoach = role === 'coach';
    const { partnerId } = req.body ?? {};
    if (!partnerId) {
      return res.status(400).json({ success: false, error: 'partnerId is required' });
    }

    const pairWhere = isCoach
      ? and(eq(schema.messages.coachId, userId), eq(schema.messages.athleteId, Number(partnerId)))
      : and(eq(schema.messages.athleteId, userId), eq(schema.messages.coachId, Number(partnerId)));

    await db
      .update(schema.messages)
      .set({ read: true })
      .where(and(pairWhere, sql`${schema.messages.senderId} <> ${userId}`));

    res.json({ success: true });
  } catch (err) {
    console.error('[messages/read]', err);
    res.status(500).json({ success: false, error: 'Failed to mark read' });
  }
});

// GET /api/messages/unread-count — total inbound unread
router.get('/unread-count', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const isCoach = role === 'coach';
    const sideWhere = isCoach ? eq(schema.messages.coachId, userId) : eq(schema.messages.athleteId, userId);

    const rows = await db
      .select()
      .from(schema.messages)
      .where(and(sideWhere, eq(schema.messages.read, false), sql`${schema.messages.senderId} <> ${userId}`));

    res.json({ success: true, data: { totalUnread: rows.length } });
  } catch (err) {
    console.error('[messages/unread-count]', err);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

// GET /api/messages/requests — pending inbound contact requests
router.get('/requests', async (req, res) => {
  try {
    const { userId } = caller(req);
    const rows = await db
      .select()
      .from(schema.messageRequests)
      .where(and(eq(schema.messageRequests.receiverId, userId), eq(schema.messageRequests.status, 'pending')))
      .orderBy(desc(schema.messageRequests.createdAt));

    // Resolve sender (athlete) names.
    const data = [];
    for (const r of rows) {
      let senderName = 'Unknown';
      if (r.athleteId != null) {
        const [a] = await db.select().from(schema.players).where(eq(schema.players.id, r.athleteId)).limit(1);
        senderName = a?.name ?? 'Unknown';
      }
      data.push({ id: r.id, athleteId: r.athleteId, senderName, content: r.content, createdAt: r.createdAt });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[messages/requests]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

// POST /api/messages/requests/:id/respond — approve or reject a request
router.post('/requests/:id/respond', async (req, res) => {
  try {
    const { userId } = caller(req);
    const id = parseInt(req.params.id, 10);
    const { action } = req.body ?? {};
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be approve or reject' });
    }

    const [reqRow] = await db.select().from(schema.messageRequests).where(eq(schema.messageRequests.id, id)).limit(1);
    if (!reqRow) return res.status(404).json({ success: false, error: 'Request not found' });
    if (reqRow.receiverId !== userId) {
      return res.status(403).json({ success: false, error: 'Not your request to respond to' });
    }

    await db
      .update(schema.messageRequests)
      .set({ status: action === 'approve' ? 'approved' : 'rejected' })
      .where(eq(schema.messageRequests.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error('[messages/respond]', err);
    res.status(500).json({ success: false, error: 'Failed to respond to request' });
  }
});

export { router as messagesRouter };
```

- [ ] **Step 2: Build the server**

Run: `cd server && npm run build`
Expected: build succeeds (this file has no `// @ts-nocheck`, so it must type-check).

- [ ] **Step 3: Runtime smoke check (if a dev DB + token are available)**

With the server running and a valid athlete token in `$TOKEN`:

```bash
curl -s http://localhost:3000/api/messages/conversations -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/api/messages/unread-count -H "Authorization: Bearer $TOKEN"
```

Expected: `{"success":true,"data":[...]}` (empty array if the account has no messages) and `{"success":true,"data":{"totalUnread":0}}`. A request with no token must return `401`.

- [ ] **Step 4: Commit**

```bash
git add server/api/messages.ts
git commit -m "feat(server): replace mock messages with real Drizzle queries + requests"
```

---

## Task 4: Backend users.ts + athletes.ts → real DB

**Files:**
- Modify (full rewrite): `server/api/users.ts`
- Modify: `server/api/athletes.ts` (list endpoint only)

- [ ] **Step 1: Rewrite users.ts**

Overwrite `server/api/users.ts`:

```ts
import express from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../auth';

const router = express.Router();
router.use(requireAuth);

function caller(req: express.Request) {
  const u = (req as any).user;
  return { userId: Number(u.userId), role: u.role as string };
}

// Pick the table for the caller's role.
function tableForRole(role: string) {
  if (role === 'coach') return schema.coaches;
  if (role === 'parent') return schema.parents;
  return schema.players;
}

const UPDATABLE_PLAYER_FIELDS = [
  'name', 'position', 'age', 'state', 'city', 'zipCode', 'school',
  'gradYear', 'gpa', 'sport', 'achievements', 'archetype', 'privacySetting',
];
const INT_FIELDS = new Set(['age', 'gradYear']);

// GET /api/users/profile — the caller's own row
router.get('/profile', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const table = tableForRole(role);
    const [row] = await db.select().from(table).where(eq(table.id, userId)).limit(1);
    if (!row) return res.status(404).json({ success: false, error: 'User not found' });
    const { passwordHash, ...safe } = row as any;
    res.json({ success: true, data: { ...safe, role } });
  } catch (err) {
    console.error('[users/profile GET]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile — update own row (players only for now)
router.put('/profile', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    if (role !== 'athlete') {
      return res.status(403).json({ success: false, error: 'Only athletes can edit this profile' });
    }
    const updates: Record<string, any> = {};
    for (const field of UPDATABLE_PLAYER_FIELDS) {
      if (req.body[field] === undefined) continue;
      let value = req.body[field];
      if (INT_FIELDS.has(field) && value !== null && value !== '') {
        const n = parseInt(value, 10);
        value = Number.isNaN(n) ? null : n;
      }
      updates[field] = value;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No updatable fields provided' });
    }
    const [row] = await db.update(schema.players).set(updates).where(eq(schema.players.id, userId)).returning();
    const { passwordHash, ...safe } = row as any;
    res.json({ success: true, data: { ...safe, role } });
  } catch (err) {
    console.error('[users/profile PUT]', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// GET /api/users/stats — combine/game-derived numbers for the caller (players only)
router.get('/stats', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    if (role !== 'athlete') return res.json({ success: true, data: {} });
    const [combine] = await db.select().from(schema.combineStats).where(eq(schema.combineStats.playerId, userId)).limit(1);
    res.json({ success: true, data: combine ?? {} });
  } catch (err) {
    console.error('[users/stats]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export { router as usersRouter };
```

- [ ] **Step 2: Replace the mock list endpoint in athletes.ts**

In `server/api/athletes.ts`, remove the `mockAthletes` array and replace the `GET /` handler with a real query. Replace the whole `router.get('/', (req, res) => { ... })` block with:

```ts
// GET /api/athletes — real DB list with optional filters
router.get('/', async (req, res) => {
  try {
    const { position, state, gradYear, limit = 20, offset = 0 } = req.query;
    const conditions = [];
    if (position && position !== 'All') conditions.push(eq(schema.players.position, String(position)));
    if (state && state !== 'All') conditions.push(eq(schema.players.state, String(state)));
    if (gradYear && gradYear !== 'All') conditions.push(eq(schema.players.gradYear, parseInt(String(gradYear), 10)));

    const rows = await db
      .select()
      .from(schema.players)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(Number(limit))
      .offset(Number(offset));

    const data = rows.map(({ passwordHash, ...safe }) => safe);
    res.json({ success: true, data, pagination: { limit: Number(limit), offset: Number(offset) } });
  } catch (err) {
    console.error('[athletes/list]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch athletes' });
  }
});
```

Add `and` to the drizzle import at the top of `athletes.ts`:

```ts
import { and, eq } from 'drizzle-orm';
```

Also remove the now-dead `POST /:id/favorite` and `GET /:id/stats` handlers that referenced `mockAthletes` (the favorite feature needs a `favorites` table that does not exist yet; return 501 from favorite instead). Replace the `POST /:id/favorite` handler body with:

```ts
router.post('/:id/favorite', (_req, res) => {
  res.status(501).json({ success: false, error: 'Favorites not implemented yet' });
});
```

And delete the `GET /:id/stats` mock handler entirely (athlete stats are served by `/api/users/stats` for the logged-in user; per-athlete public stats are a later feature).

- [ ] **Step 3: Build the server**

Run: `cd server && npm run build`
Expected: build succeeds. (`athletes.ts` has `// @ts-nocheck` so it will not block on types, but the build must still bundle without syntax errors.)

- [ ] **Step 4: Runtime smoke check (if dev DB available)**

```bash
curl -s "http://localhost:3000/api/athletes?limit=5"
curl -s http://localhost:3000/api/users/profile -H "Authorization: Bearer $TOKEN"
```

Expected: athletes list returns real registered players (array, possibly empty); profile returns the logged-in user's real row with `role` and no `passwordHash`. No-token profile request returns `401`.

- [ ] **Step 5: Commit**

```bash
git add server/api/users.ts server/api/athletes.ts
git commit -m "feat(server): wire users + athletes list to real DB queries"
```

---

## Task 5: Messages.tsx — INBOX + REQUESTS redesign

**Files:**
- Modify (full rewrite): `client/src/pages/Messages.tsx`

- [ ] **Step 1: Replace the page with a real two-tab inbox**

Overwrite `client/src/pages/Messages.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Send, Inbox, Clock } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Conversation {
  partnerId: number;
  partnerName: string;
  partnerRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}
interface ThreadMessage {
  id: number;
  content: string;
  isFromMe: boolean;
  read: boolean;
  createdAt: string;
}
interface RequestItem {
  id: number;
  athleteId: number;
  senderName: string;
  content: string;
  createdAt: string;
}

export const Messages = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'inbox' | 'requests'>('inbox');
  const [activePartner, setActivePartner] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  const { data: convData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<{ data: Conversation[] }>('/api/messages/conversations'),
  });
  const conversations = convData?.data ?? [];

  const { data: reqData } = useQuery({
    queryKey: ['message-requests'],
    queryFn: () => apiFetch<{ data: RequestItem[] }>('/api/messages/requests'),
  });
  const requests = reqData?.data ?? [];

  const { data: threadData } = useQuery({
    queryKey: ['thread', activePartner],
    queryFn: () => apiFetch<{ data: ThreadMessage[] }>(`/api/messages/conversations/${activePartner}/messages`),
    enabled: activePartner != null,
  });
  const thread = threadData?.data ?? [];

  const markRead = useMutation({
    mutationFn: (partnerId: number) =>
      apiFetch('/api/messages/read', { method: 'PUT', body: JSON.stringify({ partnerId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const send = useMutation({
    mutationFn: (vars: { partnerId: number; content: string }) =>
      apiFetch('/api/messages', { method: 'POST', body: JSON.stringify(vars) }),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['thread', activePartner] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const respond = useMutation({
    mutationFn: (vars: { id: number; action: 'approve' | 'reject' }) =>
      apiFetch(`/api/messages/requests/${vars.id}/respond`, { method: 'POST', body: JSON.stringify({ action: vars.action }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['message-requests'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  useEffect(() => {
    if (activePartner != null) markRead.mutate(activePartner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePartner]);

  const activeConv = conversations.find((c) => c.partnerId === activePartner);

  return (
    <div style={{ display: 'flex', height: '100%', color: '#fff' }}>
      {/* Left: list */}
      <div style={{ width: 320, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', padding: 12, gap: 8 }}>
          <button onClick={() => setTab('inbox')} style={tabStyle(tab === 'inbox')}>
            <Inbox size={14} /> INBOX
          </button>
          <button onClick={() => setTab('requests')} style={tabStyle(tab === 'requests')}>
            <Clock size={14} /> REQUESTS{requests.length > 0 ? ` (${requests.length})` : ''}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'inbox' && conversations.length === 0 && (
            <div style={{ padding: 24, color: '#555', fontSize: '0.8rem' }}>No conversations yet.</div>
          )}

          {tab === 'inbox' && conversations.map((c) => (
            <button
              key={c.partnerId}
              onClick={() => setActivePartner(c.partnerId)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '12px 16px', background: activePartner === c.partnerId ? 'rgba(255,90,45,0.08)' : 'transparent',
                border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', color: '#fff',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} color="#888" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.partnerName}</div>
                <div style={{ fontSize: '0.72rem', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</div>
              </div>
              {c.unreadCount > 0 && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5a2d', flexShrink: 0 }} />
              )}
            </button>
          ))}

          {tab === 'requests' && requests.length === 0 && (
            <div style={{ padding: 24, color: '#555', fontSize: '0.8rem' }}>No pending requests.</div>
          )}

          {tab === 'requests' && requests.map((r) => (
            <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.senderName}</div>
              <div style={{ fontSize: '0.75rem', color: '#888', margin: '4px 0 10px' }}>{r.content}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => respond.mutate({ id: r.id, action: 'approve' })} style={pillBtn('#ff5a2d')}>Accept</button>
                <button onClick={() => respond.mutate({ id: r.id, action: 'reject' })} style={pillBtn('#333')}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activePartner == null ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
            Select a conversation
          </div>
        ) : (
          <>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 700 }}>
              {activeConv?.partnerName ?? 'Conversation'}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {thread.map((m) => (
                <div key={m.id} style={{ alignSelf: m.isFromMe ? 'flex-end' : 'flex-start', maxWidth: '70%', background: m.isFromMe ? '#ff5a2d' : '#1c1c1c', color: '#fff', padding: '8px 14px', borderRadius: 14, fontSize: '0.85rem' }}>
                  {m.content}
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); if (draft.trim()) send.mutate({ partnerId: activePartner, content: draft.trim() }); }}
              style={{ display: 'flex', gap: 8, padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                style={{ flex: 1, background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, padding: '10px 16px', color: '#fff', outline: 'none' }}
              />
              <button type="submit" style={{ background: '#ff5a2d', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Send size={16} color="#fff" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 0', borderRadius: 9999, border: 'none', cursor: 'pointer',
    background: active ? '#ff5a2d' : '#161616', color: active ? '#fff' : '#777',
    fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em',
  };
}
function pillBtn(bg: string): React.CSSProperties {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 9999, padding: '5px 14px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' };
}
```

- [ ] **Step 2: Build the client**

Run: `cd client && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual browser check**

Log in as an athlete on the running app. Navigate to `/messages`. Expected: INBOX tab loads real conversations (empty state if none), REQUESTS tab loads pending requests, selecting a conversation loads the thread and clears its unread dot, sending a message appends it and it persists on reload.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Messages.tsx
git commit -m "feat(client): redesign Messages into real INBOX + REQUESTS inbox"
```

---

## Self-Review Notes

- **Spec section 1 (AuthContext):** Task 1. ✅
- **Spec section 2 (role-aware nav):** Task 2 — real identity + working COACH toggle. The spec's "redirect coach to /coach/dashboard from main login" was dropped because the main `/auth` form sends no role and the backend defaults to `'athlete'`; coaches authenticate through the existing `/coach/login` portal. The honest fix is making the dead toggle navigate there. ✅ (documented deviation)
- **Spec section 3 (messages backend):** Task 3 — all routes, role-keyed conversations, requests. ✅
- **Spec section 4 (inbox redesign):** Task 5 — INBOX/REQUESTS, DM icon, unread, send, mark-read. ✅
- **Spec section 5 (users + athletes):** Task 4. `GET /athletes/:id` already DB-backed (left intact); list + favorite + per-athlete stats addressed. ✅
- **Type consistency:** `apiFetch` signature, `AuthUser` shape, `Conversation`/`ThreadMessage`/`RequestItem` interfaces, and the `{ success, data }` response envelope are consistent across frontend and backend tasks. Backend uses `req.user.userId` everywhere. Role string is `'athlete'` throughout.
- **Deferred (unchanged from spec):** group chat (no `conversations` table), coach-vs-recruiter icons (no `coachType` column), request-gating on send, avatar uploads, full Settings.tsx save wiring.
```