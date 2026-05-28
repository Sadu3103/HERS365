// @ts-nocheck
/**
 * Token Routes - NIL points and XP management
 */
import express from 'express';
import { db } from './db';
import * as schema from './schema';
import { eq, desc, and, sql } from 'drizzle-orm';

const router = express.Router();

// ----------------------
// PLAYER TOKEN BALANCE
// ----------------------

// GET /tokens/player/:playerId - Get player's token balance
router.get('/player/:playerId', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const player = await db.select()
      .from(schema.players)
      .where(eq(schema.players.id, playerId));

    if (!player[0]) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      playerId,
      nilPoints: player[0].nilPoints,
      xpPoints: player[0].xpPoints,
      level: player[0].level,
      totalPoints: (player[0].nilPoints || 0) + (player[0].xpPoints || 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// EARN NIL POINTS
// ----------------------

// POST /tokens/earn - Award NIL points to a player
router.post('/earn', async (req, res) => {
  try {
    const { playerId, points, activityType, description } = req.body;

    if (!playerId || !points || !activityType) {
      return res.status(400).json({ error: 'playerId, points, and activityType are required' });
    }

    // Award points
    const updated = await db.update(schema.players)
      .set({
        nilPoints: sql`nil_points + ${points}`,
      })
      .where(eq(schema.players.id, playerId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Log the NIL activity
    await db.insert(schema.nilActivities).values({
      playerId,
      activityType,
      pointsEarned: points,
    });

    res.json({
      success: true,
      newNilPoints: updated[0].nilPoints,
      pointsEarned: points,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// EARN XP POINTS
// ----------------------

// POST /tokens/xp/earn - Award XP points to a player
router.post('/xp/earn', async (req, res) => {
  try {
    const { playerId, points, activityType } = req.body;

    if (!playerId || !points || !activityType) {
      return res.status(400).json({ error: 'playerId, points, and activityType are required' });
    }

    // Award XP
    const updated = await db.update(schema.players)
      .set({
        xpPoints: sql`xp_points + ${points}`,
      })
      .where(eq(schema.players.id, playerId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Check for level up
    const newXp = updated[0].xpPoints || 0;
    const newLevel = Math.floor(newXp / 1000) + 1;
    
    if (newLevel > updated[0].level) {
      await db.update(schema.players)
        .set({ level: newLevel })
        .where(eq(schema.players.id, playerId));
    }

    res.json({
      success: true,
      newXpPoints: updated[0].xpPoints,
      newLevel: newLevel,
      pointsEarned: points,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// TOKEN HISTORY
// ----------------------

// GET /tokens/history/:playerId - Get player's token earning history
router.get('/history/:playerId', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const { type } = req.query; // 'nil', 'xp', or undefined for all

    if (type === 'nil') {
      const history = await db.select()
        .from(schema.nilActivities)
        .where(eq(schema.nilActivities.playerId, playerId))
        .orderBy(desc(schema.nilActivities.createdAt))
        .limit(50);
      
      return res.json(history);
    }

    // For XP, we would need an XP activities table
    // For now, return recent training completions
    const trainingHistory = await db.select()
      .from(schema.skillChallengeCompletions)
      .where(eq(schema.skillChallengeCompletions.playerId, playerId))
      .orderBy(desc(schema.skillChallengeCompletions.id))
      .limit(50);

    res.json(trainingHistory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// REDEEM TOKENS
// ----------------------

// POST /tokens/redeem - Redeem tokens for rewards
router.post('/redeem', async (req, res) => {
  try {
    const { playerId, cost, rewardType, rewardId } = req.body;

    if (!playerId || !cost || !rewardType) {
      return res.status(400).json({ error: 'playerId, cost, and rewardType are required' });
    }

    const player = await db.select()
      .from(schema.players)
      .where(eq(schema.players.id, playerId));

    if (!player[0]) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Check if player has enough points
    const totalPoints = (player[0].nilPoints || 0) + (player[0].xpPoints || 0);
    if (totalPoints < cost) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    // Deduct points - prioritize XP first, then NIL
    let nilPoints = player[0].nilPoints || 0;
    let xpPoints = player[0].xpPoints || 0;
    let remaining = cost;

    if (xpPoints >= remaining) {
      xpPoints -= remaining;
      remaining = 0;
    } else {
      remaining -= xpPoints;
      xpPoints = 0;
      nilPoints -= remaining;
      remaining = 0;
    }

    await db.update(schema.players)
      .set({
        nilPoints,
        xpPoints,
      })
      .where(eq(schema.players.id, playerId));

    res.json({
      success: true,
      newNilPoints: nilPoints,
      newXpPoints: xpPoints,
      redeemed: { rewardType, rewardId, cost },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// LEADERBOARD
// ----------------------

// GET /tokens/leaderboard - Get top players by points
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'nil', limit = 10 } = req.query;

    const leaderboard = await db.select({
      id: schema.players.id,
      name: schema.players.name,
      nilPoints: schema.players.nilPoints,
      xpPoints: schema.players.xpPoints,
      level: schema.players.level,
      position: schema.players.position,
      state: schema.players.state,
    })
      .from(schema.players)
      .orderBy(type === 'xp' ? desc(schema.players.xpPoints) : desc(schema.players.nilPoints))
      .limit(Number(limit));

    // Add rankings
    const ranked = leaderboard.map((player, index) => ({
      rank: index + 1,
      ...player,
      totalPoints: (player.nilPoints || 0) + (player.xpPoints || 0),
    }));

    res.json(ranked);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
