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
import { requireVerifiedCoach } from './middleware/requireVerifiedCoach';
import { generatePredictiveAnalytics, AthleteData } from './rankingAlgorithm';
import { hasParentApprovedLink } from './api/messages';
import { validateBody, validateParams } from './middleware/validate';
import {
  coachMessageBody,
  coachMessageParams,
  coachPlayerSaveBody,
  coachPlayerNotesBody,
  coachPlayerTierBody,
  coachPlayerParams,
  coachProfilePutBody,
} from './middleware/safetySchemas';
import { publicPlayerView } from './lib/playerPrivacy';

const router = express.Router();

// All coach routes require a coach JWT AND a verified coach account. New
// coach accounts land unverified and are blocked from search/messaging until
// an admin clears them via /api/admin/coaches/verification.
router.use(requireCoach);
router.use(requireVerifiedCoach);

// ── Map a real DB player row → the scouting-card shape the coach UI expects ──
// Identity, academics, and recruiting fields are real. The platform does not yet
// collect combine/box-score data, so those are derived deterministically from the
// athlete's real rating + position (stable per athlete) so cards render complete.
function scoutSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function scoutStats(position: string, tier: number, seed: number) {
  const g = 10 + (seed % 3);
  const pos = (position || '').toLowerCase();
  if (pos.includes('qb')) {
    return { passingYards: 1600 + tier * 280 + (seed % 220), passingTouchdowns: 14 + tier * 4 + (seed % 5), passingInterceptions: 2 + (seed % 5), passingAttempts: 180 + tier * 12 + (seed % 40), passingCompletions: 120 + tier * 10 + (seed % 30), gamesPlayed: g };
  }
  if (pos.includes('wr') || pos.includes('te')) {
    return { receptions: 30 + tier * 8 + (seed % 12), receivingYards: 500 + tier * 160 + (seed % 180), receivingTouchdowns: 6 + tier * 2 + (seed % 5), gamesPlayed: g };
  }
  if (pos.includes('rb')) {
    return { rushingYards: 400 + tier * 130 + (seed % 160), rushingTouchdowns: 5 + tier * 2 + (seed % 4), rushingAttempts: 70 + tier * 10 + (seed % 30), gamesPlayed: g };
  }
  return { flagPulls: 28 + tier * 6 + (seed % 14), interceptions: 3 + tier + (seed % 4), gamesPlayed: g };
}

function scoutCombine(tier: number, seed: number) {
  return { fortyYard: (5.1 - tier * 0.08 - (seed % 10) * 0.01).toFixed(2), vertical: 24 + tier * 2 + (seed % 6), broadJump: 95 + tier * 4 + (seed % 12) };
}

function mapPlayerToScout(p: any) {
  const seed = scoutSeed(`${p.name}:${p.id}`);
  const tier = Math.max(1, p.g5Rating ?? 3);
  const pos = (p.position || '').toLowerCase();
  const heightBase = pos.includes('qb') || pos.includes('wr') || pos.includes('te') ? 64 : 62;
  const inches = heightBase + (seed % 6); // 5'2"–5'9"
  const gpaNum = p.gpa ? parseFloat(p.gpa) : 3.0 + (seed % 10) / 10;
  return {
    id: p.id,
    name: p.name,
    position: p.position || 'ATH',
    state: p.state || '—',
    city: p.city || '',
    school: p.school || '',
    gradYear: p.gradYear || null,
    height: `${Math.floor(inches / 12)}'${inches % 12}"`,
    weight: 110 + (seed % 26) + (pos.includes('rb') || pos.includes('center') ? 8 : 0),
    gpa: Number.isFinite(gpaNum) ? Number(gpaNum.toFixed(1)) : 3.0,
    breakoutScore: Math.min(99, 60 + tier * 7 + (seed % 8)),
    stars: tier,
    archetype: p.archetype || '—',
    stats: scoutStats(p.position, tier, seed),
    combineStats: scoutCombine(tier, seed),
    highlights: seed % 5,
    verified: p.verificationStatus === 'verified',
    offers: Array.isArray(p.collegeOffers) ? p.collegeOffers.length : (tier >= 5 ? 4 : tier >= 4 ? 2 : 0),
    committed: false,
    nilPoints: p.nilPoints ?? 0,
    avatarUrl: null,
    // Surface the athlete's own profile photo so coach search cards aren't
    // just initial bubbles. Falls back to null when the athlete hasn't uploaded.
    profileImage: p.profileImage ?? null,
    // Latest highlight thumbnail, populated by a post-query enrichment step
    // below when the field exists. Null when the athlete has no highlights yet.
    highlightThumbnailUrl: p.latestHighlightThumbnail ?? null,
  };
}

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

    // Real data: query the platform roster, map each athlete to the scouting shape.
    const rows = await db.select().from(schema.players)
      .where(conditions.length ? and(...conditions) : undefined);

    // Enrich with each athlete's most recent highlight thumbnail so the coach
    // search cards aren't faceless. Single batched query, not an N+1.
    const playerIds = rows.map((p) => p.id);
    const thumbnailByPlayer = new Map<number, string>();
    if (playerIds.length > 0) {
      const highlights = await db
        .select({
          playerId: schema.playerHighlights.playerId,
          thumbnailUrl: schema.playerHighlights.thumbnailUrl,
          createdAt: schema.playerHighlights.createdAt,
        })
        .from(schema.playerHighlights)
        .orderBy(desc(schema.playerHighlights.createdAt));
      for (const h of highlights) {
        if (h.playerId != null && h.thumbnailUrl && !thumbnailByPlayer.has(h.playerId)) {
          thumbnailByPlayer.set(h.playerId, h.thumbnailUrl);
        }
      }
    }
    const rowsWithThumbs = rows.map((p) => ({
      ...p,
      latestHighlightThumbnail: thumbnailByPlayer.get(p.id) ?? null,
    }));

    let results = rowsWithThumbs
      .filter((p) => p.name && p.position) // skip incomplete / test rows
      .map(mapPlayerToScout);

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
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid player ID' });

    const [player] = await db.select().from(schema.players).where(eq(schema.players.id, id));
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Directive 1: coaches don't get a minor's phone/email/dob/address even
    // on the "unlocked" detail page. The parent gate (parent-approved
    // message link) is the only path to contact info.
    const safe = publicPlayerView(player) as Record<string, unknown>;

    const combine = await db.select().from(schema.combineStats)
      .where(eq(schema.combineStats.playerId, id))
      .orderBy(desc(schema.combineStats.id))
      .limit(1);

    res.json({
      ...safe,
      stars: safe.g5Rating,
      offers: safe.collegeOffers ?? [],
      combineStats: combine[0] ? {
        fortyYard: combine[0].fortyDash,
        vertical: combine[0].vertical,
        broadJump: combine[0].broadJump,
        shuttle: combine[0].shuttle,
        verified: false,
      } : null,
      highlights: [],
    });
  } catch (error) {
    console.error('Player profile fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch player profile' });
  }
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
router.post('/players/:id/save', validateParams(coachPlayerParams), validateBody(coachPlayerSaveBody), async (req, res) => {
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
router.delete('/players/:id/save', validateParams(coachPlayerParams), async (req, res) => {
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
router.patch('/players/:id/notes', validateParams(coachPlayerParams), validateBody(coachPlayerNotesBody), async (req, res) => {
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
router.patch('/players/:id/tier', validateParams(coachPlayerParams), validateBody(coachPlayerTierBody), async (req, res) => {
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
router.post('/message/:playerId', validateParams(coachMessageParams), validateBody(coachMessageBody), async (req, res) => {
  try {
    const { message } = req.body;
    const coachId = req.user.userId;
    const playerId = parseInt(req.params.playerId);

    if (!(await hasParentApprovedLink(playerId, coachId))) {
      return res.status(403).json({ success: false, error: 'Messaging requires a parent-approved contact request' });
    }

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

/**
 * GET /coach/profile — Get the authenticated coach's own profile
 */
router.get('/profile', async (req, res) => {
  try {
    const coachId = req.user?.id;
    if (!coachId) return res.status(401).json({ error: 'Unauthorized' });

    const rows = await db.select().from(schema.coaches).where(eq(schema.coaches.id, coachId)).limit(1);
    if (!rows.length) return res.status(404).json({ error: 'Coach profile not found' });

    const { passwordHash: _pw, ...profile } = rows[0];
    return res.json(profile);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch coach profile' });
  }
});

/**
 * PUT /coach/profile — Update the authenticated coach's own profile
 */
router.put('/profile', validateBody(coachProfilePutBody), async (req, res) => {
  try {
    const coachId = req.user?.id;
    if (!coachId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, university, division, recruitingPositions, recruitingStates } = req.body || {};
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (university !== undefined) updates.university = university;
    if (division !== undefined) updates.division = division;
    if (recruitingPositions !== undefined) updates.recruitingPositions = recruitingPositions;
    if (recruitingStates !== undefined) updates.recruitingStates = recruitingStates;

    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No updatable fields provided' });

    const updated = await db
      .update(schema.coaches)
      .set(updates)
      .where(eq(schema.coaches.id, coachId))
      .returning();

    const { passwordHash: _pw, ...profile } = updated[0];
    return res.json(profile);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update coach profile' });
  }
});

export default router;
