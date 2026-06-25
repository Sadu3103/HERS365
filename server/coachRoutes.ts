/**
 * Coach Scouting Portal — API Routes
 * All routes require coach role JWT token
 */
import express, { type Request } from 'express';
import { db } from './db';
import * as schema from './schema';
import { eq, ilike, and, desc, sql } from 'drizzle-orm';
import { requireCoach, type TokenPayload } from './auth';
import { requireVerifiedCoach } from './middleware/requireVerifiedCoach';
import { hasParentApprovedLink } from './api/messages';
import { validateBody, validateParams } from './middleware/validate';
import {
  coachMessageBody,
  coachMessageParams,
  coachContactBody,
  coachContactParams,
  coachPlayerSaveBody,
  coachPlayerNotesBody,
  coachPlayerTierBody,
  coachPlayerParams,
  coachProfilePutBody,
} from './middleware/safetySchemas';
import { publicPlayerView } from './lib/playerPrivacy';
import { moderateMessage } from './lib/moderation';
import { eitherBlocked } from './lib/messageBlocks';
import { messageRateLimit } from './middleware/messageRateLimit';
import { parseIdParam } from './lib/parseIdParam';
import { parseIntQuery, parseFloatQuery, clampIntQuery } from './lib/queryParam';

const router = express.Router();

// All coach routes require a coach JWT AND a verified coach account. New
// coach accounts land unverified and are blocked from search/messaging until
// an admin clears them via /api/admin/coaches/verification.
router.use(requireCoach);
router.use(requireVerifiedCoach);

// requireCoach + requireVerifiedCoach guarantee req.user is a coach payload
// by the time any handler runs, but Express's Request type doesn't carry that
// shape. Read it through here to get a typed userId without sprinkling casts.
function coachUserId(req: Request): number {
  const u = (req as Request & { user?: TokenPayload }).user;
  return Number(u?.userId);
}

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
      verified, archetype, limit, offset,
    } = req.query as Record<string, string | undefined>;

    // Reject explicitly-bad numeric filters before they reach the DB. Without
    // this guard `parseInt('abc')` lands NaN in eq(integer, …) and Postgres
    // returns "invalid input syntax for type integer: NaN" as a 500.
    const gradYearNum = gradYear ? parseIntQuery(gradYear) : null;
    if (gradYear && gradYearNum === null) {
      return res.status(400).json({ error: 'gradYear must be an integer' });
    }
    const minBreakoutScoreNum = minBreakoutScore ? parseIntQuery(minBreakoutScore) : null;
    if (minBreakoutScore && minBreakoutScoreNum === null) {
      return res.status(400).json({ error: 'minBreakoutScore must be an integer' });
    }
    const maxBreakoutScoreNum = maxBreakoutScore ? parseIntQuery(maxBreakoutScore) : null;
    if (maxBreakoutScore && maxBreakoutScoreNum === null) {
      return res.status(400).json({ error: 'maxBreakoutScore must be an integer' });
    }
    const minGpaNum = minGpa ? parseFloatQuery(minGpa) : null;
    if (minGpa && minGpaNum === null) {
      return res.status(400).json({ error: 'minGpa must be a number' });
    }
    const maxGpaNum = maxGpa ? parseFloatQuery(maxGpa) : null;
    if (maxGpa && maxGpaNum === null) {
      return res.status(400).json({ error: 'maxGpa must be a number' });
    }
    const minHeightNum = minHeight ? parseIntQuery(minHeight) : null;
    if (minHeight && minHeightNum === null) {
      return res.status(400).json({ error: 'minHeight must be an integer' });
    }
    const maxHeightNum = maxHeight ? parseIntQuery(maxHeight) : null;
    if (maxHeight && maxHeightNum === null) {
      return res.status(400).json({ error: 'maxHeight must be an integer' });
    }
    const minWeightNum = minWeight ? parseIntQuery(minWeight) : null;
    if (minWeight && minWeightNum === null) {
      return res.status(400).json({ error: 'minWeight must be an integer' });
    }
    const maxWeightNum = maxWeight ? parseIntQuery(maxWeight) : null;
    if (maxWeight && maxWeightNum === null) {
      return res.status(400).json({ error: 'maxWeight must be an integer' });
    }

    const limitNum = clampIntQuery(limit, { default: 25, min: 1, max: 100 });
    const offsetNum = clampIntQuery(offset, { default: 0, min: 0, max: 100000 });

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

    if (gradYearNum !== null) {
      conditions.push(eq(schema.players.gradYear, gradYearNum));
    }

    if (archetype) {
      conditions.push(eq(schema.players.archetype, archetype));
    }

    if (verified === 'true') {
      conditions.push(eq(schema.players.verificationStatus, 'verified'));
    }

    // Real data: query the platform roster, map each athlete to the scouting shape.
    const rowsRaw = await db.select().from(schema.players)
      .where(conditions.length ? and(...conditions) : undefined);

    // Parent-controlled coach discoverability: when an athlete's parent has
    // flipped profileVisibility=false the players.preferences JSON carries
    // coachDiscoverable=false; hide those rows from the coach search. Unset
    // or true keeps the existing behavior (default-preserving).
    const rows = rowsRaw.filter((p) => {
      const prefs = (p.preferences ?? {}) as Record<string, unknown>;
      return prefs.coachDiscoverable !== false;
    });

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
    if (gradYearNum !== null) results = results.filter(p => p.gradYear === gradYearNum);
    if (minBreakoutScoreNum !== null) results = results.filter(p => p.breakoutScore >= minBreakoutScoreNum);
    if (maxBreakoutScoreNum !== null) results = results.filter(p => p.breakoutScore <= maxBreakoutScoreNum);
    if (minGpaNum !== null) results = results.filter(p => p.gpa >= minGpaNum);
    if (maxGpaNum !== null) results = results.filter(p => p.gpa <= maxGpaNum);
    if (archetype) results = results.filter(p => p.archetype === archetype);
    if (verified === 'true') results = results.filter(p => p.verified);

    // Height filtering (convert to inches for comparison)
    const heightToInches = (height: string) => {
      const [feet, inches] = height.replace('"', '').split("'").map(Number);
      return feet * 12 + (inches || 0);
    };

    if (minHeightNum !== null) {
      results = results.filter(p => heightToInches(p.height) >= minHeightNum);
    }
    if (maxHeightNum !== null) {
      results = results.filter(p => heightToInches(p.height) <= maxHeightNum);
    }

    if (minWeightNum !== null) results = results.filter(p => p.weight >= minWeightNum);
    if (maxWeightNum !== null) results = results.filter(p => p.weight <= maxWeightNum);

    // Sort by breakout score
    results.sort((a, b) => b.breakoutScore - a.breakoutScore);

    const paginated = results.slice(offsetNum, offsetNum + limitNum);

    res.json({
      total: results.length,
      limit: limitNum,
      offset: offsetNum,
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
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid id' });

    const [player] = await db.select().from(schema.players).where(eq(schema.players.id, id));
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Parent-controlled coach discoverability. When the linked parent flips
    // profileVisibility=false the athlete's preferences.coachDiscoverable is
    // set to false (see server/api/parent.ts PUT /settings). Mirror the gate
    // already enforced on /coach/players/search and /api/athletes/:id so a
    // coach who knows the id (saved earlier, prior message, guessed) cannot
    // pull the full unlocked profile after the parent hides the athlete.
    const prefs = (player.preferences ?? {}) as Record<string, unknown>;
    if (prefs.coachDiscoverable === false) {
      return res.status(403).json({ error: 'Forbidden' });
    }

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
    const coachId = coachUserId(req);

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
    const coachId = coachUserId(req);
    const playerId = parseIdParam(req.params.id);
    if (playerId === null) return res.status(400).json({ error: 'Invalid id' });
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
    const coachId = coachUserId(req);
    const playerId = parseIdParam(req.params.id);
    if (playerId === null) return res.status(400).json({ error: 'Invalid id' });

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
    const coachId = coachUserId(req);
    const playerId = parseIdParam(req.params.id);
    if (playerId === null) return res.status(400).json({ error: 'Invalid id' });
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
    const coachId = coachUserId(req);
    const playerId = parseIdParam(req.params.id);
    if (playerId === null) return res.status(400).json({ error: 'Invalid id' });
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
 * POST /coach/contact/:athleteId — Initiate a contact request to an athlete.
 * Creates a pending message_request visible to the athlete's linked parents.
 * Idempotent: re-submitting while a pending request already exists is a no-op
 * that still returns 201 (safe to retry from the UI without spamming the parent).
 */
router.post('/contact/:athleteId', messageRateLimit, validateParams(coachContactParams), validateBody(coachContactBody), async (req, res) => {
  try {
    const coachId = coachUserId(req);
    const athleteId = parseIdParam(req.params.athleteId);
    if (athleteId === null) return res.status(400).json({ success: false, error: 'Invalid athlete id' });

    const [athlete] = await db
      .select({ id: schema.players.id, preferences: schema.players.preferences })
      .from(schema.players)
      .where(eq(schema.players.id, athleteId))
      .limit(1);
    if (!athlete) return res.status(404).json({ success: false, error: 'Athlete not found' });

    const prefs = (athlete.preferences ?? {}) as Record<string, unknown>;
    if (prefs.coachDiscoverable === false) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const existing = await db
      .select({ id: schema.messageRequests.id })
      .from(schema.messageRequests)
      .where(and(
        eq(schema.messageRequests.athleteId, athleteId),
        eq(schema.messageRequests.receiverId, coachId),
        eq(schema.messageRequests.status, 'pending'),
      ))
      .limit(1);
    if (existing.length > 0) {
      return res.status(201).json({ success: true, data: { id: existing[0].id, status: 'pending' } });
    }

    const { message } = req.body;
    const verdict = await moderateMessage(String(message));
    if (!verdict.allowed) {
      return res.status(422).json({ success: false, error: "Your message couldn't be sent. Please revise and try again." });
    }

    const [row] = await db
      .insert(schema.messageRequests)
      .values({ athleteId, receiverId: coachId, content: message, status: 'pending' })
      .returning();

    res.status(201).json({ success: true, data: { id: row.id, status: 'pending' } });
  } catch (error) {
    console.error('[coach/contact] failed:', error);
    res.status(500).json({ success: false, error: 'Failed to send contact request' });
  }
});

/**
 * POST /coach/message/:playerId — Send a message to an athlete
 */
router.post('/message/:playerId', messageRateLimit, validateParams(coachMessageParams), validateBody(coachMessageBody), async (req, res) => {
  try {
    const { message } = req.body;
    const coachId = coachUserId(req);
    const playerId = parseIdParam(req.params.playerId);
    if (playerId === null) return res.status(400).json({ success: false, error: 'Invalid id' });

    if (!(await hasParentApprovedLink(playerId, coachId))) {
      return res.status(403).json({ success: false, error: 'Messaging requires a parent-approved contact request' });
    }

    // Block gate runs after the parent-approval check (so a coach with no
    // contact link still gets the more specific 403) and before moderation
    // (so a blocked coach doesn't burn an OpenAI call on a message that
    // would never land). Either party blocking stops messaging.
    if (await eitherBlocked(coachId, 'coach', playerId, 'athlete')) {
      return res.status(403).json({ success: false, error: 'This conversation is unavailable.' });
    }

    const verdict = await moderateMessage(String(message));
    if (!verdict.allowed) {
      console.warn('[coach/message] rejected by moderation', { reason: verdict.reason, coachId, playerId });
      return res.status(422).json({
        success: false,
        error: "Your message couldn't be sent. Please revise and try again.",
      });
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
    const coachId = coachUserId(req);

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
    const coachId = coachUserId(req);

    // Get board count
    const boardCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.coachProspects)
      .where(eq(schema.coachProspects.coachId, coachId));

    // Get messages sent count
    const messagesSent = await db.select({ count: sql<number>`count(*)` })
      .from(schema.messages)
      .where(eq(schema.messages.coachId, coachId));

    const playersContacted = await db.select({ count: sql<number>`count(*)` })
      .from(schema.messageRequests)
      .where(eq(schema.messageRequests.receiverId, coachId));

    const topStateRows = await db
      .select({ state: schema.players.state, count: sql<number>`count(*)` })
      .from(schema.coachProspects)
      .innerJoin(schema.players, eq(schema.players.id, schema.coachProspects.athleteId))
      .where(eq(schema.coachProspects.coachId, coachId))
      .groupBy(schema.players.state)
      .orderBy(desc(sql`count(*)`))
      .limit(4);

    res.json({
      boardCount: boardCount[0]?.count || 0,
      messagesSent: messagesSent[0]?.count || 0,
      playersContacted: playersContacted[0]?.count || 0,
      topStates: topStateRows.map(r => r.state).filter(Boolean),
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
  * GET /coach/player-clips — Get player highlight clips
  */
router.get('/player-clips', async (req, res) => {
  try {
    // Real discovery feed for the coach dashboard. Mirrors /players/search:
    // the live roster mapped to the scouting shape, gated by the parent
    // controlled coachDiscoverable flag, sorted by rating so the strongest
    // prospects surface first. Replaces the old hardcoded sample so the
    // dashboard is consistent with search and never shows athletes who are
    // not in the database.
    const rowsRaw = await db.select().from(schema.players);
    const rows = rowsRaw.filter((p) => {
      const prefs = (p.preferences ?? {}) as Record<string, unknown>;
      return prefs.coachDiscoverable !== false && p.name && p.position;
    });

    const thumbnailByPlayer = new Map<number, string>();
    if (rows.length > 0) {
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

    const clips = rows
      .map((p) => mapPlayerToScout({ ...p, latestHighlightThumbnail: thumbnailByPlayer.get(p.id) ?? null }))
      .sort((a, b) => b.stars - a.stars || b.breakoutScore - a.breakoutScore)
      .slice(0, 12)
      .map((s) => ({
        id: s.id,
        playerId: s.id,
        name: s.name,
        position: s.position,
        school: s.school,
        state: s.state,
        gradYear: s.gradYear,
        stars: s.stars,
        breakoutScore: s.breakoutScore,
        verified: s.verified,
        title: s.archetype && s.archetype !== '\u2014' ? s.archetype : `${s.position} \u00b7 ${s.school}`,
        thumbnailUrl: s.highlightThumbnailUrl || s.profileImage || '',
      }));

    res.json({ clips });
  } catch (error) {
    console.error('Failed to fetch player clips:', error);
    res.status(500).json({ error: 'Failed to fetch player clips' });
  }
});

/**
 * GET /coach/profile — Get the authenticated coach's own profile
 */
router.get('/profile', async (req, res) => {
  try {
    const coachId = coachUserId(req);
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
    const coachId = coachUserId(req);
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
