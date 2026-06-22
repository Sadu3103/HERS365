import express, { Request, Response, NextFunction } from 'express';
import { db } from './db';
import * as schema from './schema';
import * as ai from './ai';
import * as mp from './maxpreps';
import { eq, desc, sql, and } from 'drizzle-orm';
import { requireAuth, requireAdmin, type TokenPayload } from './auth';

const router = express.Router();

import { publicPlayerView, selfPlayerView } from './lib/playerPrivacy';
import { parseIdParam } from './lib/parseIdParam';

// requireAuth attaches the token payload to req.user, but Express's Request
// type doesn't know about it. Read it through here for typed access.
function authUser(req: Request): TokenPayload | undefined {
  return (req as Request & { user?: TokenPayload }).user;
}

// Own-profile view (kept for clarity at call sites): only the password hash
// is stripped; the caller is the player so they can see their own contact
// info.
const stripPlayer = selfPlayerView;

// Public projection — contact info of a minor never leaves list/detail
// endpoints. Strips email/phone/dob/zip/pendingParentEmail/passwordHash.
const publicPlayer = publicPlayerView;

// SUBSCRIPTION PLANS
router.get('/subscription-plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await db.select().from(schema.subscriptionPlans).orderBy(schema.subscriptionPlans.price);
    res.json(plans);
  } catch (err: any) {
    next(err);
  }
});

router.post('/subscription-plans', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, price, tierLevel } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    const newPlan = await db.insert(schema.subscriptionPlans).values({ name, price, tierLevel }).returning();
    res.json(newPlan[0]);
  } catch (err: any) {
    next(err);
  }
});

router.get('/player-subscription/:playerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pId = parseIdParam(req.params.playerId);
    if (pId === null) return res.status(400).json({ error: 'Invalid id' });
    const subscription = await db.select()
      .from(schema.playerSubscriptions)
      .where(eq(schema.playerSubscriptions.playerId, pId));
    if (subscription.length === 0) return res.json({ status: 'none', plan: null });
    const subPlanId = subscription[0].planId;
    const plan = subPlanId != null
      ? await db.select()
          .from(schema.subscriptionPlans)
          .where(eq(schema.subscriptionPlans.id, subPlanId))
      : [];
    res.json({ ...subscription[0], plan: plan[0] || null });
  } catch (err: any) {
    next(err);
  }
});

router.post('/player-subscription', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { playerId, planId, stripeSubscriptionId } = req.body;
    if (!playerId || !planId) {
      return res.status(400).json({ error: 'PlayerId and planId are required' });
    }
    if (authUser(req)!.userId !== playerId) return res.status(403).json({ error: 'Forbidden' });
    const existing = await db.select()
      .from(schema.playerSubscriptions)
      .where(eq(schema.playerSubscriptions.playerId, playerId));
    if (existing.length > 0) {
      const updated = await db.update(schema.playerSubscriptions)
        .set({ planId, stripeSubscriptionId, status: 'active' })
        .where(eq(schema.playerSubscriptions.playerId, playerId))
        .returning();
      return res.json(updated[0]);
    }
    const newSub = await db.insert(schema.playerSubscriptions)
      .values({ playerId, planId, stripeSubscriptionId, status: 'active' })
      .returning();
    const plan = await db.select().from(schema.subscriptionPlans).where(eq(schema.subscriptionPlans.id, planId));
    if (plan.length > 0) {
      await db.update(schema.players)
        .set({ subscriptionTier: plan[0].tierLevel })
        .where(eq(schema.players.id, playerId));
    }
    res.json(newSub[0]);
  } catch (err: any) {
    next(err);
  }
});

// CURRENT USER PROFILE
router.get('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db.select().from(schema.players).where(eq(schema.players.id, authUser(req)!.userId)).limit(1);
    res.json(stripPlayer(rows[0]) || null);
  } catch (err: any) {
    next(err);
  }
});

router.put('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, bio, position, school, state, gradYear, heightIn, weightLbs, phone, profileImage } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (position !== undefined) updates.position = position;
    if (school !== undefined) updates.school = school;
    if (state !== undefined) updates.state = state;
    if (gradYear !== undefined) updates.gradYear = gradYear;
    if (heightIn !== undefined) updates.heightIn = heightIn === '' ? null : Number(heightIn);
    if (weightLbs !== undefined) updates.weightLbs = weightLbs === '' ? null : Number(weightLbs);
    if (phone !== undefined) updates.phone = phone || null;
    // Custom profile photo URL. Client uploads to /api/upload/presign first,
    // then sends the resulting publicUrl here.
    if (profileImage !== undefined) updates.profileImage = profileImage || null;
    const updated = await db.update(schema.players).set(updates).where(eq(schema.players.id, authUser(req)!.userId)).returning();
    res.json(stripPlayer(updated[0]));
  } catch (err: any) {
    next(err);
  }
});

router.get('/profile/stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gameStats = await db.select().from(schema.gameStats).where(eq(schema.gameStats.playerId, authUser(req)!.userId));
    const combineStats = await db.select().from(schema.combineStats).where(eq(schema.combineStats.playerId, authUser(req)!.userId)).limit(1);
    res.json({ game: gameStats, combine: combineStats[0] || null });
  } catch (err: any) {
    next(err);
  }
});

// PLAYERS & TEAMS
router.get('/players', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allPlayers = await db.select().from(schema.players);
    res.json(allPlayers.map(publicPlayer));
  } catch (err: any) {
    next(err);
  }
});

router.get('/players/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pId = parseIdParam(req.params.id);
    if (pId === null) return res.status(400).json({ error: 'Invalid id' });
    const player = await db.select().from(schema.players).where(eq(schema.players.id, pId));
    res.json(publicPlayer(player[0]) || null);
  } catch (err: any) {
    next(err);
  }
});

router.get('/players/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pId = parseIdParam(req.params.id);
    if (pId === null) return res.status(400).json({ error: 'Invalid id' });
    const stats = await db.select().from(schema.gameStats).where(eq(schema.gameStats.playerId, pId));
    res.json(stats);
  } catch (err: any) {
    next(err);
  }
});

router.get('/players/:id/highlights', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pId = parseIdParam(req.params.id);
    if (pId === null) return res.status(400).json({ error: 'Invalid id' });
    const [player] = await db.select({ subscriptionTier: schema.players.subscriptionTier })
      .from(schema.players).where(eq(schema.players.id, pId)).limit(1);
    const isPaid = !!player?.subscriptionTier && player.subscriptionTier !== 'free';
    if (isPaid) {
      const highlights = await db.select().from(schema.playerHighlights).where(eq(schema.playerHighlights.playerId, pId));
      return res.json(highlights.map(h => ({ ...h, locked: false })));
    }
    const free = await db.select().from(schema.playerHighlights)
      .where(eq(schema.playerHighlights.playerId, pId)).limit(3);
    return res.json(free.map(h => ({ ...h, locked: false })));
  } catch (err: any) {
    next(err);
  }
});

router.post('/players/:id/highlights', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pId = parseIdParam(req.params.id);
    if (pId === null) return res.status(400).json({ error: 'Invalid id' });
    if (authUser(req)!.userId !== pId) return res.status(403).json({ error: 'Forbidden' });
    const { videoUrl, thumbnailUrl, category, season, annotations, clipSettings } = req.body;
    const newHighlight = await db.insert(schema.playerHighlights).values({
      playerId: pId,
      videoUrl,
      thumbnailUrl,
      category,
      season,
      annotations,
      clipSettings
    }).returning();
    res.json(newHighlight[0]);
  } catch (err: any) {
    next(err);
  }
});

router.get('/teams', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allTeams = await db.select().from(schema.teams);
    res.json(allTeams);
  } catch (err: any) {
    next(err);
  }
});

// SOCIAL FEED
router.get('/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allPosts = await db
      .select({
        id: schema.posts.id,
        content: schema.posts.content,
        mediaUrl: schema.posts.mediaUrl,
        mediaType: schema.posts.mediaType,
        likes: schema.posts.likes,
        comments: schema.posts.comments,
        createdAt: schema.posts.createdAt,
        category: schema.posts.category,
        playerName: schema.players.name,
        playerPosition: schema.players.position,
        playerSchool: schema.players.school,
        playerGradYear: schema.players.gradYear,
        playerRating: schema.players.g5Rating,
        playerTier: schema.players.subscriptionTier,
      })
      .from(schema.posts)
      .leftJoin(schema.players, eq(schema.posts.playerId, schema.players.id))
      .orderBy(desc(schema.posts.createdAt))
      .limit(50);
    res.json(allPosts);
  } catch (err: any) {
    next(err);
  }
});

router.post('/posts', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, mediaUrl, mediaType } = req.body;
    const newPost = await db.insert(schema.posts).values({
      playerId: authUser(req)!.userId,
      content,
      mediaUrl,
      mediaType
    }).returning();
    await db.update(schema.players)
      .set({ nilPoints: sql`nil_points + 10` })
      .where(eq(schema.players.id, authUser(req)!.userId));
    res.json(newPost[0]);
  } catch (err: any) {
    next(err);
  }
});

router.get('/stories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allStories = await db.select().from(schema.stories);
    res.json(allStories);
  } catch (err: any) {
    next(err);
  }
});

// AI BOTS & TRAINING
router.get('/bot/:playerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pId = parseIdParam(req.params.playerId);
    if (pId === null) return res.status(400).json({ error: 'Invalid id' });
    let bots = await db.select().from(schema.aiBots).where(eq(schema.aiBots.playerId, pId));
    if (bots.length === 0) {
      const generated = await ai.generateBotName();
      bots = await db.insert(schema.aiBots).values({
        playerId: pId,
        botName: generated.botName,
        personality: generated.personality
      }).returning();
    }
    res.json(bots[0]);
  } catch (err: any) {
    next(err);
  }
});

router.post('/bot/:botId/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bId = parseIdParam(req.params.botId);
    if (bId === null) return res.status(400).json({ error: 'Invalid id' });
    const { message, context } = req.body;
    const reply = await ai.chatBot(bId, [{ role: 'user', content: message }], context);
    res.json({ reply });
  } catch (err: any) {
    next(err);
  }
});

router.get('/nil/opportunities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const opps = await db.select().from(schema.nilOpportunities).limit(20);
    res.json(opps);
  } catch (err: any) {
    next(err);
  }
});

router.post('/nil/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    const reply = await ai.chatNIL([{ role: 'user', content: message }]);
    res.json({ reply });
  } catch (err: any) {
    next(err);
  }
});

router.post('/training-plans', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { position = 'QB', age = 16, skillLevel = 'Intermediate' } = req.body;
    const plan = await ai.generateTrainingPlan(position, age, skillLevel);
    res.json(plan);
  } catch (err: any) {
    next(err);
  }
});

// MAXPREPS — GIRLS FLAG FOOTBALL
router.get('/maxpreps/player', async (req: Request, res: Response, next: NextFunction) => {
  const { name, school, state } = req.query as Record<string, string>;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const results = await mp.searchMaxPrepsPlayer(name, state);
    const filtered = school ? results.filter(p => p.schoolName.toLowerCase().includes(school.toLowerCase())) : results;
    if (filtered.length === 1 && filtered[0].maxprepsId) {
      const detailedStats = await mp.fetchPlayerStats(filtered[0].maxprepsId);
      if (detailedStats) filtered[0].stats = { ...filtered[0].stats, ...detailedStats };
    }
    res.json({ source: 'maxpreps', query: { name, school, state }, count: filtered.length, players: filtered });
  } catch (err: any) {
    next(err);
  }
});

router.get('/maxpreps/stats/:maxprepsId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await mp.fetchPlayerStats(String(req.params.maxprepsId));
    if (!stats) return res.status(404).json({ error: 'Player not found on MaxPreps' });
    res.json({ source: 'maxpreps', stats });
  } catch (err: any) {
    next(err);
  }
});

router.get('/maxpreps/leaders', async (req: Request, res: Response, next: NextFunction) => {
  const { category = 'receiving', state, season = '2025' } = req.query as Record<string, string>;
  try {
    const leaders = await mp.fetchFlagFootballLeaders(category as any, state, season);
    res.json({ source: 'maxpreps', category, state: state || 'national', season, leaders });
  } catch (err: any) {
    next(err);
  }
});

router.get('/maxpreps/rankings', async (req: Request, res: Response, next: NextFunction) => {
  const { state = 'TX', season = '2025' } = req.query as Record<string, string>;
  try {
    const teams = await mp.fetchStateTeamRankings(state, season);
    res.json({ source: 'maxpreps', state, season, teams });
  } catch (err: any) {
    next(err);
  }
});

router.get('/maxpreps/team/:schoolGID/roster', async (req: Request, res: Response, next: NextFunction) => {
  const { season = '2025' } = req.query as Record<string, string>;
  try {
    const roster = await mp.fetchTeamRoster(String(req.params.schoolGID), season);
    res.json({ source: 'maxpreps', season, players: roster });
  } catch (err: any) {
    next(err);
  }
});


// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

// GET /notifications - list for authenticated player
router.get('/notifications', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = authUser(req)?.id;
    if (!playerId) return res.status(401).json({ error: 'Not authenticated' });
    const isNaN_guard = isNaN(parseInt(String(playerId)));
    if (isNaN_guard) return res.status(400).json({ error: 'Invalid player ID' });
    const rows = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.playerId, parseInt(String(playerId))))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(30);
    const unreadCount = rows.filter((n) => !n.read).length;
    res.json({ notifications: rows, unreadCount });
  } catch (err: any) {
    next(err);
  }
});

// POST /notifications/mark-read - mark all as read
router.post('/notifications/mark-read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = authUser(req)?.id;
    if (!playerId) return res.status(401).json({ error: 'Not authenticated' });
    await db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.playerId, parseInt(String(playerId))));
    res.json({ ok: true });
  } catch (err: any) {
    next(err);
  }
});

// POST /notifications/mark-read/:id - mark one as read
router.post('/notifications/mark-read/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid id' });
    const callerId = authUser(req)?.id;
    if (!callerId) return res.status(401).json({ error: 'Not authenticated' });
    // Scope the update by both id AND owner so a notification belonging to
    // another user can never be flipped. Treat "not yours" and "doesn't
    // exist" the same (404) so the endpoint doesn't reveal which it is.
    const updated = await db
      .update(schema.notifications)
      .set({ read: true })
      .where(and(
        eq(schema.notifications.id, id),
        eq(schema.notifications.playerId, Number(callerId)),
      ))
      .returning({ id: schema.notifications.id });
    if (updated.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (err: any) {
    next(err);
  }
});

// Internal helper: create a notification (called from other routes)
export async function createNotification(
  playerId: number,
  type: string,
  actorName: string,
  metadata?: Record<string, string>
) {
  try {
    await db.insert(schema.notifications).values({
      playerId,
      type,
      actorName,
      read: false,
    });
  } catch (err) {
    console.error('[notifications] insert failed:', err);
  }
}

export default router;
