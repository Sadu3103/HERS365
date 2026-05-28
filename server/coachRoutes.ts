// @ts-nocheck
/**
 * Coach Scouting Portal — API Routes
 * All routes require coach role JWT token
 */
import express from 'express';
import { db } from './db';
import * as schema from './schema';
import { eq, ilike, and, desc, sql } from 'drizzle-orm';
import { requireCoach } from './auth';
import { generatePredictiveAnalytics, AthleteData } from './rankingAlgorithm';

const router = express.Router();

// Apply coach middleware to ALL coach routes
router.use(requireCoach);

// ─── Database-backed scouting board and messaging ───────────────────────────

// ─── Player Search (the main discovery tool) ──────────────────────────────────

/**
 * GET /coach/players/search
 * Advanced player search with comprehensive filters
 */
router.get('/players/search', async (req, res) => {
  try {
    const {
      q, position, state, gradYear, minBreakoutScore, maxBreakoutScore,
      minGpa, maxGpa, minHeight, maxHeight, minWeight, maxWeight,
      verified, archetype, limit = '25', offset = '0'
    } = req.query as Record<string, string>;

    // Build where conditions
    const conditions = [];

    if (q) {
      conditions.push(ilike(schema.players.name, `%${q}%`));
    }

    if (position) {
      conditions.push(eq(schema.players.position, position));
    }

    if (state) {
      conditions.push(eq(schema.players.state, state));
    }

    if (gradYear) {
      conditions.push(eq(schema.players.gradYear, parseInt(gradYear)));
    }

    if (archetype) {
      conditions.push(eq(schema.players.archetype, archetype));
    }

    if (verified === 'true') {
      conditions.push(eq(schema.players.verificationStatus, 'verified'));
    }

    // For now, return mock data with enhanced filtering
    // TODO: Replace with real database query when player stats are in database
    const mockPlayers = [
      {
        id: 1, name: 'Aaliyah Thompson', position: 'WR', state: 'TX', city: 'Dallas',
        school: 'Westlake High', gradYear: 2026, height: '5\'8"', weight: 135,
        gpa: 3.8, breakoutScore: 98, stars: 5, archetype: 'Speedster',
        stats: { receptions: 64, receivingYards: 1204, receivingTouchdowns: 18, gamesPlayed: 12 },
        combineStats: { fortyYard: '4.52', vertical: 36, broadJump: 118 },
        highlights: 2, verified: true, offers: 4, committed: false,
        nilPoints: 4200, avatarUrl: null,
      },
      {
        id: 2, name: 'Jordan Davis', position: 'QB', state: 'FL', city: 'Miami',
        school: 'Miami Southridge', gradYear: 2026, height: '5\'10"', weight: 145,
        gpa: 3.5, breakoutScore: 95, stars: 5, archetype: 'Dual-Threat',
        stats: { passingYards: 2840, passingTouchdowns: 32, passingInterceptions: 4, passingAttempts: 220, passingCompletions: 162, gamesPlayed: 12 },
        combineStats: { fortyYard: '4.65', vertical: 31, broadJump: 110 },
        highlights: 5, verified: true, offers: 7, committed: false,
        nilPoints: 3100, avatarUrl: null,
      },
      {
        id: 3, name: 'Maya Rodriguez', position: 'CB', state: 'CA', city: 'Los Angeles',
        school: 'Crenshaw High', gradYear: 2027, height: '5\'7"', weight: 128,
        gpa: 4.0, breakoutScore: 89, stars: 4, archetype: 'Lockdown',
        stats: { flagPulls: 48, interceptions: 8, gamesPlayed: 11 },
        combineStats: { fortyYard: '4.58', vertical: 34, broadJump: 115 },
        highlights: 3, verified: false, offers: 2, committed: false,
        nilPoints: 1800, avatarUrl: null,
      },
      {
        id: 4, name: 'Destiny Williams', position: 'RB', state: 'GA', city: 'Atlanta',
        school: 'Westlake HS (GA)', gradYear: 2026, height: '5\'5"', weight: 130,
        gpa: 3.2, breakoutScore: 84, stars: 4, archetype: 'Power Back',
        stats: { rushingYards: 934, rushingTouchdowns: 12, rushingAttempts: 98, gamesPlayed: 11 },
        combineStats: { fortyYard: '4.71', vertical: 29, broadJump: 105 },
        highlights: 1, verified: true, offers: 1, committed: false,
        nilPoints: 900, avatarUrl: null,
      },
    ];

    let results = [...mockPlayers];

    // Apply filters
    if (q) results = results.filter(p =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.school.toLowerCase().includes(q.toLowerCase())
    );
    if (position) results = results.filter(p => p.position === position);
    if (state) results = results.filter(p => p.state === state);
    if (gradYear) results = results.filter(p => p.gradYear === parseInt(gradYear));
    if (minBreakoutScore) results = results.filter(p => p.breakoutScore >= parseInt(minBreakoutScore));
    if (maxBreakoutScore) results = results.filter(p => p.breakoutScore <= parseInt(maxBreakoutScore));
    if (minGpa) results = results.filter(p => p.gpa >= parseFloat(minGpa));
    if (maxGpa) results = results.filter(p => p.gpa <= parseFloat(maxGpa));
    if (archetype) results = results.filter(p => p.archetype === archetype);
    if (verified === 'true') results = results.filter(p => p.verified);

    // Height filtering (convert to inches for comparison)
    const heightToInches = (height: string) => {
      const [feet, inches] = height.replace('"', '').split("'").map(Number);
      return feet * 12 + (inches || 0);
    };

    if (minHeight) {
      const minInches = parseInt(minHeight);
      results = results.filter(p => heightToInches(p.height) >= minInches);
    }
    if (maxHeight) {
      const maxInches = parseInt(maxHeight);
      results = results.filter(p => heightToInches(p.height) <= maxInches);
    }

    if (minWeight) results = results.filter(p => p.weight >= parseInt(minWeight));
    if (maxWeight) results = results.filter(p => p.weight <= parseInt(maxWeight));

    // Sort by breakout score
    results.sort((a, b) => b.breakoutScore - a.breakoutScore);

    const paginated = results.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      total: results.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      players: paginated,
    });
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /coach/players/:id — Full unlocked athlete profile (coaches see everything)
 */
router.get('/players/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const mockFull = {
    id,
    name: 'Aaliyah Thompson',
    position: 'WR',
    state: 'TX',
    city: 'Dallas',
    school: 'Westlake High',
    gradYear: 2026,
    height: '5\'8"',
    weight: 135,
    gpa: 3.8,
    breakoutScore: 98,
    stars: 5,
    archetype: 'WR Speedster',
    email: 'available@premium',
    phone: 'available@premium',
    parentContact: 'available@premium',
    highlights: [
      { title: 'Junior Season Full Game', url: 'https://youtube.com/...', locked: false },
      { title: 'State Championship Highlights', url: 'https://youtube.com/...', locked: false },
    ],
    stats: { receptions: 64, receivingYards: 1204, receivingTouchdowns: 18, ydsPerCatch: 18.8, gamesPlayed: 12 },
    combineStats: { fortyYard: '4.52', vertical: 36, broadJump: 118, shuttle: '4.15', verified: true },
    academicProfile: { gpa: 3.8, act: 27, sat: 1280, major: 'Sports Medicine' },
    offers: ['TCU', 'Baylor', 'UTSA', 'Rice'],
    committed: false,
    nilPoints: 4200,
  };
  res.json(mockFull);
});

// ─── Scouting Board ───────────────────────────────────────────────────────────

/**
 * GET /coach/board — Get coach's scouting board
 */
router.get('/board', async (req, res) => {
  try {
    const coachId = req.user.userId;

    const board = await db.select()
      .from(schema.coachProspects)
      .where(eq(schema.coachProspects.coachId, coachId))
      .orderBy(schema.coachProspects.createdAt);

    res.json({ board });
  } catch (error) {
    console.error('Failed to fetch scouting board:', error);
    res.status(500).json({ error: 'Failed to fetch scouting board' });
  }
});

/**
 * POST /coach/players/:id/save — Add player to scouting board
 */
router.post('/players/:id/save', async (req, res) => {
  try {
    const coachId = req.user.userId;
    const playerId = parseInt(req.params.id);
    const { tier = 'watching' } = req.body; // tiers: 'top-target' | 'watching' | 'offered'

    // Check if already exists
    const existing = await db.select()
      .from(schema.coachProspects)
      .where(and(
        eq(schema.coachProspects.coachId, coachId),
        eq(schema.coachProspects.athleteId, playerId)
      ));

    if (existing.length > 0) {
      // Update tier if different
      if (existing[0].tier !== tier) {
        await db.update(schema.coachProspects)
          .set({ tier })
          .where(and(
            eq(schema.coachProspects.coachId, coachId),
            eq(schema.coachProspects.athleteId, playerId)
          ));
      }
    } else {
      // Add new prospect
      await db.insert(schema.coachProspects).values({
        coachId,
        athleteId: playerId,
        tier,
        notes: '',
      });
    }

    // Return updated board
    const board = await db.select()
      .from(schema.coachProspects)
      .where(eq(schema.coachProspects.coachId, coachId))
      .orderBy(schema.coachProspects.createdAt);

    res.json({ success: true, board });
  } catch (error) {
    console.error('Failed to save player:', error);
    res.status(500).json({ error: 'Failed to save player' });
  }
});

/**
 * DELETE /coach/players/:id/save — Remove from scouting board
 */
router.delete('/players/:id/save', async (req, res) => {
  try {
    const coachId = req.user.userId;
    const playerId = parseInt(req.params.id);

    await db.delete(schema.coachProspects)
      .where(and(
        eq(schema.coachProspects.coachId, coachId),
        eq(schema.coachProspects.athleteId, playerId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to remove player:', error);
    res.status(500).json({ error: 'Failed to remove player' });
  }
});

/**
 * PATCH /coach/players/:id/notes — Update notes for a player on scouting board
 */
router.patch('/players/:id/notes', async (req, res) => {
  try {
    const coachId = req.user.userId;
    const playerId = parseInt(req.params.id);
    const { notes } = req.body;

    await db.update(schema.coachProspects)
      .set({ notes: notes || '' })
      .where(and(
        eq(schema.coachProspects.coachId, coachId),
        eq(schema.coachProspects.athleteId, playerId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update notes:', error);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

/**
 * PATCH /coach/players/:id/tier — Update tier for a player on scouting board
 */
router.patch('/players/:id/tier', async (req, res) => {
  try {
    const coachId = req.user.userId;
    const playerId = parseInt(req.params.id);
    const { tier } = req.body;

    const validTiers = ['top-target', 'watching', 'offered'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    await db.update(schema.coachProspects)
      .set({ tier })
      .where(and(
        eq(schema.coachProspects.coachId, coachId),
        eq(schema.coachProspects.athleteId, playerId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update tier:', error);
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// ─── Messaging ────────────────────────────────────────────────────────────────

/**
 * POST /coach/message/:playerId — Send a message to an athlete
 */
router.post('/message/:playerId', async (req, res) => {
  try {
    const { message } = req.body;
    const coachId = req.user.userId;
    const playerId = parseInt(req.params.playerId);

    const newMessage = await db.insert(schema.messages).values({
      coachId,
      athleteId: playerId,
      senderId: coachId,
      senderType: 'coach',
      content: message,
      read: false,
    }).returning();

    res.json({ success: true, message: newMessage[0] });
  } catch (error) {
    console.error('Failed to send message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * GET /coach/messages — Get coach's message history
 */
router.get('/messages', async (req, res) => {
  try {
    const coachId = req.user.userId;

    const messages = await db.select({
      id: schema.messages.id,
      coachId: schema.messages.coachId,
      athleteId: schema.messages.athleteId,
      senderId: schema.messages.senderId,
      senderType: schema.messages.senderType,
      content: schema.messages.content,
      read: schema.messages.read,
      createdAt: schema.messages.createdAt,
      coachName: schema.coaches.name,
      coachEmail: schema.coaches.email,
      athleteName: schema.players.name,
    })
    .from(schema.messages)
    .leftJoin(schema.coaches, eq(schema.messages.coachId, schema.coaches.id))
    .leftJoin(schema.players, eq(schema.messages.athleteId, schema.players.id))
    .where(eq(schema.messages.coachId, coachId))
    .orderBy(desc(schema.messages.createdAt));

    res.json({ messages });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ─── Coach Analytics ──────────────────────────────────────────────────────────

/**
  * GET /coach/analytics — Recently viewed players, board stats
  */
router.get('/analytics', async (req, res) => {
  try {
    const coachId = req.user.userId;

    // Get board count
    const boardCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.coachProspects)
      .where(eq(schema.coachProspects.coachId, coachId));

    // Get messages sent count
    const messagesSent = await db.select({ count: sql<number>`count(*)` })
      .from(schema.messages)
      .where(eq(schema.messages.coachId, coachId));

    // For now, using mock data for other metrics
    res.json({
      boardCount: boardCount[0]?.count || 0,
      messagesSent: messagesSent[0]?.count || 0,
      profileViews: 47, // mock
      topStates: ['TX', 'FL', 'CA', 'GA'],
      recentlyViewed: [1, 2, 3],
      searchQueries: 23, // mock
      playersContacted: 18, // mock
      offersExtended: 5, // mock
      commitsReceived: 2, // mock
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
  * GET /coach/player-clips — Get player highlight clips
  */
router.get('/player-clips', (req, res) => {
  const clips = [
    {
      id: 1,
      playerId: 1,
      name: 'Aaliyah Thompson',
      position: 'WR',
      school: 'Westlake High',
      state: 'TX',
      gradYear: 2026,
      stars: 5,
      breakoutScore: 98,
      clipUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=600&auto=format&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=600&auto=format&fit=crop',
      title: 'One-handed catch in double coverage 🤯 #StateChamps',
      views: 1245,
      likes: 234,
      shares: 45,
      measurements: {
        height: '5\'8"',
        weight: '135 lbs',
        fortyYard: '4.52',
        vertical: '36"',
        broadJump: '118"'
      },
      stats: {
        receptions: 64,
        receivingYards: 1204,
        receivingTouchdowns: 18
      },
      verified: true,
      createdAt: '2024-05-15T14:30:00Z'
    },
    {
      id: 2,
      playerId: 2,
      name: 'Jordan Davis',
      position: 'QB',
      school: 'Miami Southridge',
      state: 'FL',
      gradYear: 2026,
      stars: 5,
      breakoutScore: 95,
      clipUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600&auto=format&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600&auto=format&fit=crop',
      title: 'Testing the deep ball at Elite11 regional camp 🚀',
      views: 987,
      likes: 189,
      shares: 32,
      measurements: {
        height: '5\'10"',
        weight: '145 lbs',
        fortyYard: '4.65',
        vertical: '31"',
        broadJump: '110"'
      },
      stats: {
        passingYards: 2840,
        passingTouchdowns: 32,
        passingInterceptions: 4
      },
      verified: true,
      createdAt: '2024-05-14T16:45:00Z'
    },
    {
      id: 3,
      playerId: 3,
      name: 'Maya Rodriguez',
      position: 'CB',
      school: 'Crenshaw High',
      state: 'CA',
      gradYear: 2027,
      stars: 4,
      breakoutScore: 89,
      clipUrl: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=600&auto=format&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=600&auto=format&fit=crop',
      title: 'Lockdown coverage at the 7on7 tournament 🔒',
      views: 756,
      likes: 145,
      shares: 28,
      measurements: {
        height: '5\'7"',
        weight: '128 lbs',
        fortyYard: '4.58',
        vertical: '34"',
        broadJump: '115"'
      },
      stats: {
        flagPulls: 48,
        interceptions: 8
      },
      verified: false,
      createdAt: '2024-05-13T18:20:00Z'
    },
    {
      id: 4,
      playerId: 4,
      name: 'Destiny Williams',
      position: 'RB',
      school: 'Westlake HS (GA)',
      state: 'GA',
      gradYear: 2026,
      stars: 4,
      breakoutScore: 84,
      clipUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=600&auto=format&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=600&auto=format&fit=crop',
      title: '40-yard reverse for the game-winner! 🏃‍♀️💨',
      views: 1567,
      likes: 289,
      shares: 67,
      measurements: {
        height: '5\'5"',
        weight: '130 lbs',
        fortyYard: '4.71',
        vertical: '29"',
        broadJump: '105"'
      },
      stats: {
        rushingYards: 934,
        rushingTouchdowns: 12,
        rushingAttempts: 98
      },
      verified: true,
      createdAt: '2024-05-12T19:15:00Z'
    }
  ];

  res.json({ clips });
});

export default router;
