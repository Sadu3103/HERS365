// @ts-nocheck
import express, { Request, Response } from 'express';
import { db } from './db';
import * as schema from './schema';
import * as ai from './ai';
import { eq, desc, and, sql } from 'drizzle-orm';
import { AuthenticatedRequest, requireAdmin } from './auth';

const router = express.Router();

// Extend Response interface locally or use any if TS is strict
interface CustomResponse extends Response {
  success?: (data: any, message?: string) => void;
}

// ----------------------
// SUBSCRIPTION PLANS
// ----------------------
router.get('/subscription-plans', async (req: Request, res: CustomResponse) => {
  try {
    const plans = await db.select().from(schema.subscriptionPlans).orderBy(schema.subscriptionPlans.price);
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscription-plans', requireAdmin, async (req: Request, res: CustomResponse) => {
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

// Get player's current subscription
router.get('/player-subscription/:playerId', async (req: Request, res: CustomResponse) => {
  try {
    const pId = parseInt(req.params.playerId);
    const subscription = await db.select()
      .from(schema.playerSubscriptions)
      .where(eq(schema.playerSubscriptions.playerId, pId));
    
    if (subscription.length === 0) {
      return res.json({ status: 'none', plan: null });
    }
    
    const plan = await db.select()
      .from(schema.subscriptionPlans)
      .where(eq(schema.subscriptionPlans.id, subscription[0].planId));
    
    res.json({ ...subscription[0], plan: plan[0] || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update player subscription
router.post('/player-subscription', async (req: Request, res: CustomResponse) => {
  try {
    const { playerId, planId, stripeSubscriptionId } = req.body;
    if (!playerId || !planId) {
      return res.status(400).json({ error: 'PlayerId and planId are required' });
    }
    
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

// ----------------------
// PLAYERS & TEAMS
// ----------------------
router.get('/players', async (req: Request, res: CustomResponse) => {
  try {
    const allPlayers = await db.select().from(schema.players);
    res.json(allPlayers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/players/:id', async (req: Request, res: CustomResponse) => {
  const pId = parseInt(req.params.id);
  const player = await db.select().from(schema.players).where(eq(schema.players.id, pId));
  res.json(player[0] || null);
});

router.get('/players/:id/stats', async (req: Request, res: CustomResponse) => {
  const pId = parseInt(req.params.id);
  const stats = await db.select().from(schema.gameStats).where(eq(schema.gameStats.playerId, pId));
  res.json(stats);
});

router.get('/players/:id/highlights', async (req: Request, res: CustomResponse) => {
  const pId = parseInt(req.params.id);
  const highlights = await db.select().from(schema.playerHighlights).where(eq(schema.playerHighlights.playerId, pId));
  const safeHighlights = highlights.map((h, i) => {
    if (i >= 2) return { ...h, videoUrl: null, thumbnailUrl: null, locked: true };
    return { ...h, locked: false };
  });
  res.json(safeHighlights);
});

router.post('/players/:id/highlights', async (req: Request, res: CustomResponse) => {
  try {
    const pId = parseInt(req.params.id);
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

router.get('/teams', async (req: Request, res: CustomResponse) => {
  const allTeams = await db.select().from(schema.teams);
  res.json(allTeams);
});

// ----------------------
// SOCIAL FEED
// ----------------------
router.get('/posts', async (req: Request, res: CustomResponse) => {
  const allPosts = await db.select().from(schema.posts).orderBy(desc(schema.posts.createdAt)).limit(50);
  res.json(allPosts);
});

router.post('/posts', async (req: AuthenticatedRequest, res: CustomResponse) => {
  const { playerId, content, mediaUrl, mediaType } = req.body;
  const newPost = await db.insert(schema.posts).values({ playerId, content, mediaUrl, mediaType }).returning();
  await db.update(schema.players).set({ nilPoints: 30 }).where(eq(schema.players.id, playerId));
  res.json(newPost[0]);
});

router.get('/stories', async (req: Request, res: CustomResponse) => {
  const allStories = await db.select().from(schema.stories);
  res.json(allStories);
});

// ----------------------
// AI BOTS & TRAINING
// ----------------------
router.get('/bot/:playerId', async (req: Request, res: CustomResponse) => {
    const pId = parseInt(req.params.playerId);
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
});

router.post('/bot/:botId/chat', async (req: Request, res: CustomResponse) => {
    const bId = parseInt(req.params.botId);
    const { message, context } = req.body;
    const reply = await ai.chatBot(bId, [{ role: 'user', content: message }], context);
    res.json({ reply });
});

router.post('/nil/chat', async (req: Request, res: CustomResponse) => {
    const { message } = req.body;
    const reply = await ai.chatNIL([{ role: 'user', content: message }]);
    res.json({ reply });
});

router.post('/training-plans', async (req: Request, res: CustomResponse) => {
    const plan = await ai.generateTrainingPlan('QB', 16, 'Intermediate');
    res.json(plan);
});

// ─────────────────────────────────────────────────────────────────────────────
// MAXPREPS — GIRLS FLAG FOOTBALL
// ─────────────────────────────────────────────────────────────────────────────
import * as mp from './maxpreps';

router.get('/maxpreps/player', async (req: Request, res: CustomResponse) => {
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

router.get('/maxpreps/stats/:maxprepsId', async (req: Request, res: CustomResponse) => {
  try {
    const stats = await mp.fetchPlayerStats(req.params.maxprepsId);
    if (!stats) return res.status(404).json({ error: 'Player not found on MaxPreps' });
    res.json({ source: 'maxpreps', stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/maxpreps/leaders', async (req: Request, res: CustomResponse) => {
  const { category = 'receiving', state, season = '2025' } = req.query as Record<string, string>;
  try {
    const leaders = await mp.fetchFlagFootballLeaders(category as any, state, season);
    res.json({ source: 'maxpreps', category, state: state || 'national', season, leaders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/maxpreps/rankings', async (req: Request, res: CustomResponse) => {
  const { state = 'TX', season = '2025' } = req.query as Record<string, string>;
  try {
    const teams = await mp.fetchStateTeamRankings(state, season);
    res.json({ source: 'maxpreps', state, season, teams });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/maxpreps/team/:schoolGID/roster', async (req: Request, res: CustomResponse) => {
  const { season = '2025' } = req.query as Record<string, string>;
  try {
    const roster = await mp.fetchTeamRoster(req.params.schoolGID, season);
    res.json({ source: 'maxpreps', season, players: roster });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

