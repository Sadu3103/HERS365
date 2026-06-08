// @ts-nocheck
import express, { Request, Response } from 'express';
import { db } from './db';
import * as schema from './schema';
import * as ai from './ai';
import * as mp from './maxpreps';
import { eq, desc, sql } from 'drizzle-orm';
import { AuthenticatedRequest, requireAuth, requireAdmin } from './auth';

const router = express.Router();

// SUBSCRIPTION PLANS
router.get('/subscription-plans', async (req: Request, res: Response) => {
  try {
    const plans = await db.select().from(schema.subscriptionPlans).orderBy(schema.subscriptionPlans.price);
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscription-plans', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, price, tierLevel } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    const newPlan = await db.insert(schema.subscriptionPlans).values({ name, price, tierLevel }).returning();
    res.json(newPlan[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/player-subscription/:playerId', async (req: Request, res: Response) => {
  try {
    const pId = parseInt(req.params.playerId);
    if (isNaN(pId)) return res.status(400).json({ error: 'Invalid player ID' });
    const subscription = await db.select()
      .from(schema.playerSubscriptions)
      .where(eq(schema.playerSubscriptions.playerId, pId));
    if (subscription.length === 0) return res.json({ status: 'none', plan: null });
    const plan = await db.select()
      .from(schema.subscriptionPlans)
      .where(eq(schema.subscriptionPlans.id, subscription[0].planId));
    res.json({ ...subscription[0], plan: plan[0] || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/player-subscription', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { playerId, planId, stripeSubscriptionId } = req.body;
    if (!playerId || !planId) {
      return res.status(400).json({ error: 'PlayerId and planId are required' });
    }
    if (req.user.userId !== playerId) return res.status(403).json({ error: 'Forbidden' });
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
    res.status(500).json({ error: err.message });
  }
});

// CURRENT USER PROFILE
router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await db.select().from(schema.players).where(eq(schema.players.id, req.user.userId)).limit(1);
    res.json(rows[0] || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, bio, position, school, state, gradYear } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (position !== undefined) updates.position = position;
    if (school !== undefined) updates.school = school;
    if (state !== undefined) updates.state = state;
    if (gradYear !== undefined) updates.gradYear = gradYear;
    const updated = await db.update(schema.players).set(updates).where(eq(schema.players.id, req.user.userId)).returning();
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PLAYERS & TEAMS
router.get('/players', async (req: Request, res: Response) => {
  try {
    const allPlayers = await db.select().from(schema.players);
    res.json(allPlayers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/players/:id', async (req: Request, res: Response) => {
  try {
    const pId = parseInt(req.params.id);
    if (isNaN(pId)) return res.status(400).json({ error: 'Invalid player ID' });
    const player = await db.select().from(schema.players).where(eq(schema.players.id, pId));
    res.json(player[0] || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/players/:id/stats', async (req: Request, res: Response) => {
  try {
    const pId = parseInt(req.params.id);
    if (isNaN(pId)) return res.status(400).json({ error: 'Invalid player ID' });
    const stats = await db.select().from(schema.gameStats).where(eq(schema.gameStats.playerId, pId));
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/players/:id/highlights', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pId = parseInt(req.params.id);
    if (isNaN(pId)) return res.status(400).json({ error: 'Invalid player ID' });
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
    res.status(500).json({ error: err.message });
  }
});

router.post('/players/:id/highlights', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pId = parseInt(req.params.id);
    if (isNaN(pId)) return res.status(400).json({ error: 'Invalid player ID' });
    if (req.user.userId !== pId) return res.status(403).json({ error: 'Forbidden' });
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
    res.status(500).json({ error: err.message });
  }
});

router.get('/teams', async (req: Request, res: Response) => {
  try {
    const allTeams = await db.select().from(schema.teams);
    res.json(allTeams);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SOCIAL FEED
router.get('/posts', async (req: Request, res: Response) => {
  try {
    const allPosts = await db.select().from(schema.posts).orderBy(desc(schema.posts.createdAt)).limit(50);
    res.json(allPosts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, mediaUrl, mediaType } = req.body;
    const newPost = await db.insert(schema.posts).values({
      playerId: req.user.userId,
      content,
      mediaUrl,
      mediaType
    }).returning();
    await db.update(schema.players)
      .set({ nilPoints: sql`nil_points + 10` })
      .where(eq(schema.players.id, req.user.userId));
    res.json(newPost[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stories', async (req: Request, res: Response) => {
  try {
    const allStories = await db.select().from(schema.stories);
    res.json(allStories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI BOTS & TRAINING
router.get('/bot/:playerId', async (req: Request, res: Response) => {
  try {
    const pId = parseInt(req.params.playerId);
    if (isNaN(pId)) return res.status(400).json({ error: 'Invalid player ID' });
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
    res.status(500).json({ error: err.message });
  }
});

router.post('/bot/:botId/chat', async (req: Request, res: Response) => {
  try {
    const bId = parseInt(req.params.botId);
    if (isNaN(bId)) return res.status(400).json({ error: 'Invalid bot ID' });
    const { message, context } = req.body;
    const reply = await ai.chatBot(bId, [{ role: 'user', content: message }], context);
    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/nil/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const reply = await ai.chatNIL([{ role: 'user', content: message }]);
    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/training-plans', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { position = 'QB', age = 16, skillLevel = 'Intermediate' } = req.body;
    const plan = await ai.generateTrainingPlan(position, age, skillLevel);
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// MAXPREPS — GIRLS FLAG FOOTBALL
router.get('/maxpreps/player', async (req: Request, res: Response) => {
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
    res.status(500).json({ error: err.message });
  }
});

router.get('/maxpreps/stats/:maxprepsId', async (req: Request, res: Response) => {
  try {
    const stats = await mp.fetchPlayerStats(req.params.maxprepsId);
    if (!stats) return res.status(404).json({ error: 'Player not found on MaxPreps' });
    res.json({ source: 'maxpreps', stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/maxpreps/leaders', async (req: Request, res: Response) => {
  const { category = 'receiving', state, season = '2025' } = req.query as Record<string, string>;
  try {
    const leaders = await mp.fetchFlagFootballLeaders(category as any, state, season);
    res.json({ source: 'maxpreps', category, state: state || 'national', season, leaders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/maxpreps/rankings', async (req: Request, res: Response) => {
  const { state = 'TX', season = '2025' } = req.query as Record<string, string>;
  try {
    const teams = await mp.fetchStateTeamRankings(state, season);
    res.json({ source: 'maxpreps', state, season, teams });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/maxpreps/team/:schoolGID/roster', async (req: Request, res: Response) => {
  const { season = '2025' } = req.query as Record<string, string>;
  try {
    const roster = await mp.fetchTeamRoster(req.params.schoolGID, season);
    res.json({ source: 'maxpreps', season, players: roster });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
