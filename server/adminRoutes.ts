/**
 * Admin Routes - Administrative functions for platform management
 */
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db';
import * as schema from './schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { requireAdmin } from './auth';
import { withoutPasswordHash } from './lib/playerPrivacy';
import { clampIntQuery } from './lib/queryParam';
import { parseIdParam } from './lib/parseIdParam';
import { fetchAndExtract, getAIClient } from './lib/scraper';

const router = express.Router();

// ----------------------
// DASHBOARD STATS
// ----------------------

// GET /admin/stats - Get platform-wide statistics
router.get('/stats', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Total players
    const playerCount = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(schema.players);

    // Total coaches
    const coachCount = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(schema.coaches);

    // Total parents
    const parentCount = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(schema.parents);

    // Total posts
    const postCount = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(schema.posts);

    // Total events
    const eventCount = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(schema.events);

    // Total payments (revenue)
    const revenueResult = await db.select({
      total: sql<number>`coalesce(sum(amount), 0)::int`,
    }).from(schema.payments)
      .where(eq(schema.payments.status, 'completed'));

    // Subscription breakdown
    const subscriptionStats = await db.select({
      tier: schema.players.subscriptionTier,
      count: sql<number>`count(*)::int`,
    }).from(schema.players)
      .groupBy(schema.players.subscriptionTier);

    // Recent signups (last 7 days)
    const recentSignups = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(schema.players)
      .where(sql`created_at > now() - interval '7 days'`);

    // Verification status breakdown
    const verificationStats = await db.select({
      status: schema.players.verificationStatus,
      count: sql<number>`count(*)::int`,
    }).from(schema.players)
      .groupBy(schema.players.verificationStatus);

    res.json({
      totalPlayers: playerCount[0]?.count || 0,
      totalCoaches: coachCount[0]?.count || 0,
      totalParents: parentCount[0]?.count || 0,
      totalPosts: postCount[0]?.count || 0,
      totalEvents: eventCount[0]?.count || 0,
      totalRevenue: revenueResult[0]?.total || 0,
      recentSignups: recentSignups[0]?.count || 0,
      subscriptionStats,
      verificationStats,
    });
  } catch (err: any) {
    next(err);
  }
});

// ----------------------
// USER MANAGEMENT
// ----------------------

// GET /admin/users - List all users with filters
router.get('/users', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, page, limit, search } = req.query;
    const pageNum = clampIntQuery(page, { default: 1, min: 1, max: 100000 });
    const limitNum = clampIntQuery(limit, { default: 20, min: 1, max: 200 });
    const offset = (pageNum - 1) * limitNum;

    let users: any[] = [];
    let total = 0;

    // Even on admin endpoints we never ship bcrypt hashes back to the
    // client. They have no operational use in a dashboard and the row was
    // already loaded with .select() so the hash is in memory.
    if (role === 'player') {
      const rows = await db.select().from(schema.players).limit(limitNum).offset(offset);
      users = rows.map(withoutPasswordHash);
      const count = await db.select({ count: sql<number>`count(*)::int` }).from(schema.players);
      total = count[0]?.count || 0;
    } else if (role === 'coach') {
      const rows = await db.select().from(schema.coaches).limit(limitNum).offset(offset);
      users = rows.map(withoutPasswordHash);
      const count = await db.select({ count: sql<number>`count(*)::int` }).from(schema.coaches);
      total = count[0]?.count || 0;
    } else if (role === 'parent') {
      const rows = await db.select().from(schema.parents).limit(limitNum).offset(offset);
      users = rows.map(withoutPasswordHash);
      const count = await db.select({ count: sql<number>`count(*)::int` }).from(schema.parents);
      total = count[0]?.count || 0;
    } else {
      // Return all users combined
      const players = await db.select({
        id: schema.players.id,
        email: schema.players.email,
        name: schema.players.name,
        role: sql`'player'`,
        createdAt: schema.players.createdAt,
      }).from(schema.players).limit(limitNum).offset(offset);

      users = players;
      const count = await db.select({ count: sql<number>`count(*)::int` }).from(schema.players);
      total = count[0]?.count || 0;
    }

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    next(err);
  }
});

// PATCH /admin/users/:id/verify - Verify a player
router.patch('/users/:id/verify', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseIdParam(req.params.id);
    if (userId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const { status } = req.body;

    const updated = await db.update(schema.players)
      .set({ verificationStatus: status })
      .where(eq(schema.players.id, userId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(withoutPasswordHash(updated[0]));
  } catch (err: any) {
    next(err);
  }
});

// PATCH /admin/users/:id/subscription - Update user subscription
router.patch('/users/:id/subscription', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseIdParam(req.params.id);
    if (userId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const { tier } = req.body;

    const updated = await db.update(schema.players)
      .set({ subscriptionTier: tier })
      .where(eq(schema.players.id, userId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(withoutPasswordHash(updated[0]));
  } catch (err: any) {
    next(err);
  }
});

// DELETE /admin/users/:id - Delete a user
router.delete('/users/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseIdParam(req.params.id);
    if (userId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const { role } = req.query;

    if (role === 'coach') {
      await db.delete(schema.coaches).where(eq(schema.coaches.id, userId));
    } else if (role === 'parent') {
      await db.delete(schema.parents).where(eq(schema.parents.id, userId));
    } else {
      await db.delete(schema.players).where(eq(schema.players.id, userId));
    }

    res.json({ success: true, message: 'User deleted' });
  } catch (err: any) {
    next(err);
  }
});

// ----------------------
// CONTENT MODERATION
// ----------------------

// GET /admin/reports - Get reported content
router.get('/reports', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page, limit } = req.query;
    const pageNum = clampIntQuery(page, { default: 1, min: 1, max: 100000 });
    const limitNum = clampIntQuery(limit, { default: 20, min: 1, max: 200 });
    const offset = (pageNum - 1) * limitNum;

    // Get flagged posts for moderation
    const posts = await db.select()
      .from(schema.posts)
      .where(eq(schema.posts.moderationStatus, 'flagged'))
      .limit(limitNum)
      .offset(offset);

    const count = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.posts)
      .where(eq(schema.posts.moderationStatus, 'flagged'));

    res.json({
      reports: posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count[0]?.count || 0,
      },
    });
  } catch (err: any) {
    next(err);
  }
});

// PATCH /admin/posts/:id/moderate - Moderate a post
router.patch('/posts/:id/moderate', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = parseIdParam(req.params.id);
    if (postId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const { status } = req.body; // approved, flagged, pending

    const updated = await db.update(schema.posts)
      .set({ moderationStatus: status })
      .where(eq(schema.posts.id, postId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(updated[0]);
  } catch (err: any) {
    next(err);
  }
});

// ----------------------
// EVENT MANAGEMENT
// ----------------------

// POST /admin/events - Create an event
router.post('/events', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, date, location, registrationDeadline, participantCount } = req.body;

    const newEvent = await db.insert(schema.events).values({
      name,
      date: date ?? '',
      location,
      registrationDeadline: registrationDeadline ?? null,
      participantCount: participantCount || 0,
    }).returning();

    res.json(newEvent[0]);
  } catch (err: any) {
    next(err);
  }
});

// PATCH /admin/events/:id - Update an event
router.patch('/events/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = parseIdParam(req.params.id);
    if (eventId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const { name, date, location, registrationDeadline, participantCount } = req.body;

    const updated = await db.update(schema.events)
      .set({
        ...(name && { name }),
        ...(date && { date: date as string }),
        ...(location && { location }),
        ...(registrationDeadline && { registrationDeadline: registrationDeadline as string }),
        ...(participantCount && { participantCount }),
      })
      .where(eq(schema.events.id, eventId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(updated[0]);
  } catch (err: any) {
    next(err);
  }
});

// DELETE /admin/events/:id - Delete an event
router.delete('/events/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = parseIdParam(req.params.id);
    if (eventId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    await db.delete(schema.events).where(eq(schema.events.id, eventId));
    res.json({ success: true, message: 'Event deleted' });
  } catch (err: any) {
    next(err);
  }
});

// ----------------------
// PAYMENT MANAGEMENT
// ----------------------

// GET /admin/payments - Get all payments
router.get('/payments', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page, limit } = req.query;
    const pageNum = clampIntQuery(page, { default: 1, min: 1, max: 100000 });
    const limitNum = clampIntQuery(limit, { default: 50, min: 1, max: 200 });
    const offset = (pageNum - 1) * limitNum;

    const baseQuery = db.select({
      id: schema.payments.id,
      playerId: schema.payments.playerId,
      amount: schema.payments.amount,
      currency: schema.payments.currency,
      status: schema.payments.status,
      paymentMethod: schema.payments.paymentMethod,
      paymentType: schema.payments.paymentType,
      description: schema.payments.description,
      createdAt: schema.payments.createdAt,
      playerName: schema.players.name,
    })
      .from(schema.payments)
      .leftJoin(schema.players, eq(schema.payments.playerId, schema.players.id));

    const payments = await (status
      ? baseQuery.where(eq(schema.payments.status, status as string))
      : baseQuery
    )
      .orderBy(desc(schema.payments.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json(payments);
  } catch (err: any) {
    next(err);
  }
});

// ----------------------
// BADGE MANAGEMENT
// ----------------------

// GET /admin/badges - Get all badges
router.get('/badges', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const badges = await db.select().from(schema.badges);
    res.json(badges);
  } catch (err: any) {
    next(err);
  }
});

// POST /admin/badges - Create a badge
router.post('/badges', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, icon, category } = req.body;

    const newBadge = await db.insert(schema.badges).values({
      name,
      description,
      icon,
      category,
    }).returning();

    res.json(newBadge[0]);
  } catch (err: any) {
    next(err);
  }
});

// ----------------------
// NIL OPPORTUNITIES
// ----------------------

// GET /admin/nil-opportunities - Get all NIL opportunities
router.get('/nil-opportunities', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const opportunities = await db.select().from(schema.nilOpportunities);
    res.json(opportunities);
  } catch (err: any) {
    next(err);
  }
});

// POST /admin/nil-opportunities - Create NIL opportunity
router.post('/nil-opportunities', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { brandName, requirements, deliverables, estimatedEarnings } = req.body;

    const newOpportunity = await db.insert(schema.nilOpportunities).values({
      brandName,
      requirements,
      deliverables,
      estimatedEarnings,
    }).returning();

    res.json(newOpportunity[0]);
  } catch (err: any) {
    next(err);
  }
});

// ----------------------
// SUBSCRIPTION PLAN MANAGEMENT
// ----------------------

// GET /admin/subscription-plans - Get all subscription plans
router.get('/subscription-plans', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await db.select().from(schema.subscriptionPlans);
    res.json(plans);
  } catch (err: any) {
    next(err);
  }
});

// POST /admin/subscription-plans - Create a subscription plan
router.post('/subscription-plans', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, price, tierLevel } = req.body;

    const newPlan = await db.insert(schema.subscriptionPlans).values({
      name,
      price,
      tierLevel,
    }).returning();

    res.json(newPlan[0]);
  } catch (err: any) {
    next(err);
  }
});

// PATCH /admin/subscription-plans/:id - Update a subscription plan
router.patch('/subscription-plans/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = parseIdParam(req.params.id);
    if (planId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const { name, price, tierLevel } = req.body;

    const updated = await db.update(schema.subscriptionPlans)
      .set({
        ...(name && { name }),
        ...(price !== undefined && { price }),
        ...(tierLevel && { tierLevel }),
      })
      .where(eq(schema.subscriptionPlans.id, planId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    res.json(updated[0]);
  } catch (err: any) {
    next(err);
  }
});

// DELETE /admin/subscription-plans/:id - Delete a subscription plan
router.delete('/subscription-plans/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = parseIdParam(req.params.id);
    if (planId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    await db.delete(schema.subscriptionPlans).where(eq(schema.subscriptionPlans.id, planId));
    res.json({ success: true, message: 'Subscription plan deleted' });
  } catch (err: any) {
    next(err);
  }
});

// ----------------------
// ATHLETE VERIFICATION [B-29]
// ----------------------

// POST /admin/athletes/:id/verify - Verify an athlete profile
router.post('/athletes/:id/verify', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const athleteId = parseIdParam(req.params.id);
    if (athleteId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const { verified } = req.body;

    if (typeof verified !== 'boolean') {
      return res.status(400).json({ error: '"verified" boolean field is required' });
    }

    const updated = await db.update(schema.players)
      .set({ verificationStatus: verified ? 'verified' : 'unverified' })
      .where(eq(schema.players.id, athleteId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    res.json(withoutPasswordHash(updated[0]));
  } catch (err: any) {
    next(err);
  }
});

// ----------------------
// COACH MANAGEMENT
// ----------------------

// GET /admin/coaches/verification - Get coaches pending verification
router.get('/coaches/verification', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coaches = await db.select().from(schema.coaches)
      .where(eq(schema.coaches.verifiedStatus, false));
    res.json(coaches.map(withoutPasswordHash));
  } catch (err: any) {
    next(err);
  }
});

// PATCH /admin/coaches/:id/verify - Verify a coach
router.patch('/coaches/:id/verify', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coachId = parseIdParam(req.params.id);
    if (coachId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const { verified } = req.body;

    const updated = await db.update(schema.coaches)
      .set({
        verifiedStatus: Boolean(verified),
        verifiedAt: verified ? new Date() : null,
      })
      .where(eq(schema.coaches.id, coachId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    res.json(withoutPasswordHash(updated[0]));
  } catch (err: any) {
    next(err);
  }
});

// ----------------------
// TEAM MANAGEMENT
// ----------------------

// GET /admin/teams - Get all teams
router.get('/teams', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await db.select().from(schema.teams);
    res.json(teams);
  } catch (err: any) {
    next(err);
  }
});

// POST /admin/teams - Create a team
router.post('/teams', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, logo, state, city, conference, division, wins, losses, titles, rating,
           tuitionInState, tuitionOutState, hasApplication, hasQuestionnaire,
           applicationUrl, questionnaireUrl, socials, type } = req.body;

    const newTeam = await db.insert(schema.teams).values({
      name,
      logo,
      state,
      city,
      conference,
      division,
      wins,
      losses,
      titles,
      rating,
      tuitionInState,
      tuitionOutState,
      hasApplication,
      hasQuestionnaire,
      applicationUrl,
      questionnaireUrl,
      socials,
      type,
    }).returning();

    res.json(newTeam[0]);
  } catch (err: any) {
    next(err);
  }
});

// PATCH /admin/teams/:id - Update a team
router.patch('/teams/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = parseIdParam(req.params.id);
    if (teamId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const { name, logo, state, city, conference, division, wins, losses, titles, rating,
           tuitionInState, tuitionOutState, hasApplication, hasQuestionnaire,
           applicationUrl, questionnaireUrl, socials, type } = req.body;

    const updated = await db.update(schema.teams)
      .set({
        ...(name && { name }),
        ...(logo && { logo }),
        ...(state && { state }),
        ...(city && { city }),
        ...(conference && { conference }),
        ...(division && { division }),
        ...(wins !== undefined && { wins }),
        ...(losses !== undefined && { losses }),
        ...(titles !== undefined && { titles }),
        ...(rating !== undefined && { rating }),
        ...(tuitionInState !== undefined && { tuitionInState }),
        ...(tuitionOutState !== undefined && { tuitionOutState }),
        ...(hasApplication !== undefined && { hasApplication }),
        ...(hasQuestionnaire !== undefined && { hasQuestionnaire }),
        ...(applicationUrl && { applicationUrl }),
        ...(questionnaireUrl && { questionnaireUrl }),
        ...(socials && { socials }),
        ...(type && { type }),
      })
      .where(eq(schema.teams.id, teamId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(updated[0]);
  } catch (err: any) {
    next(err);
  }
});

// DELETE /admin/teams/:id - Delete a team
router.delete('/teams/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = parseIdParam(req.params.id);
    if (teamId === null) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    await db.delete(schema.teams).where(eq(schema.teams.id, teamId));
    res.json({ success: true, message: 'Team deleted' });
  } catch (err: any) {
    next(err);
  }
});

// ── RECRUITING ADMIN ──────────────────────────────────────────────────────────

// GET /admin/programs — all programs + programDetails + staff counts
router.get('/programs', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select({
        id: schema.teams.id,
        name: schema.teams.name,
        division: schema.teams.division,
        city: schema.teams.city,
        state: schema.teams.state,
        websiteUrl: schema.programDetails.websiteUrl,
        lastScrapedAt: schema.programDetails.lastScrapedAt,
        staffCount: sql<number>`(SELECT count(*)::int FROM program_staff WHERE program_staff.team_id = ${schema.teams.id})`,
      })
      .from(schema.teams)
      .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
      .where(eq(schema.teams.type, 'college'));
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// GET /admin/ai-status — ping Ollama / report AI backend availability
router.get('/ai-status', requireAdmin, async (_req: Request, res: Response) => {
  const ai = getAIClient();
  if (!ai) return res.json({ available: false, model: null, backend: null });
  try {
    if (ai.isOllama) {
      const r = await fetch(`${process.env.OLLAMA_BASE_URL}/api/tags`);
      const data = await r.json() as { models?: { name: string }[] };
      const model = data.models?.[0]?.name ?? ai.model;
      return res.json({ available: true, model, backend: 'ollama' });
    }
    return res.json({ available: true, model: ai.model, backend: 'openai' });
  } catch {
    return res.json({ available: false, model: null, backend: null });
  }
});

// POST /admin/programs/:teamId/refresh — expanded Ollama/OpenAI scrape for one program
router.post('/programs/:teamId/refresh', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = parseIdParam(req.params.teamId);
    if (teamId === null) return res.status(400).json({ success: false, error: 'Invalid teamId' });

    const ai = getAIClient();
    if (!ai) return res.status(503).json({ success: false, error: 'No AI backend configured' });

    const teamRows = await db.select().from(schema.teams).where(eq(schema.teams.id, teamId)).limit(1);
    if (!teamRows[0]) return res.status(404).json({ success: false, error: 'Team not found' });

    const detailRows = await db.select({ websiteUrl: schema.programDetails.websiteUrl })
      .from(schema.programDetails).where(eq(schema.programDetails.teamId, teamId)).limit(1);
    const websiteUrl = detailRows[0]?.websiteUrl;
    if (!websiteUrl) return res.status(404).json({ success: false, error: 'No website URL' });

    const result = await fetchAndExtract({ id: teamId, name: teamRows[0].name, website: websiteUrl }, { expanded: true });

    await db.delete(schema.programStaff).where(eq(schema.programStaff.teamId, teamId));
    if (result.staff.length > 0) {
      await db.insert(schema.programStaff).values(
        result.staff.map(m => ({ teamId, name: m.name, title: m.title, email: m.email ?? null, phone: m.phone ?? null, scrapedFrom: websiteUrl }))
      );
    }
    await db.update(schema.programDetails).set({ lastScrapedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.programDetails.teamId, teamId));

    res.json({ success: true, data: { teamId, staff: result.staff } });
  } catch (err) { next(err); }
});

// POST /admin/programs/refresh-all — background scrape of all programs without lastScrapedAt
router.post('/programs/refresh-all', requireAdmin, async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Background refresh started' });
  (async () => {
    const teams = await db.select({
      id: schema.teams.id,
      name: schema.teams.name,
      websiteUrl: schema.programDetails.websiteUrl,
    })
      .from(schema.teams)
      .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
      .where(eq(schema.teams.type, 'college'));

    for (const team of teams) {
      if (!team.websiteUrl || !getAIClient()) continue;
      try {
        const result = await fetchAndExtract({ id: team.id, name: team.name, website: team.websiteUrl });
        await db.delete(schema.programStaff).where(eq(schema.programStaff.teamId, team.id));
        if (result.staff.length > 0) {
          await db.insert(schema.programStaff).values(
            result.staff.map(m => ({ teamId: team.id, name: m.name, title: m.title, email: m.email ?? null, phone: m.phone ?? null, scrapedFrom: team.websiteUrl! }))
          );
        }
        await db.update(schema.programDetails).set({ lastScrapedAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.programDetails.teamId, team.id));
      } catch { /* skip failures */ }
    }
  })().catch(console.error);
});

// GET /admin/stories/pending — unapproved commitment stories
router.get('/stories/pending', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db.select().from(schema.commitmentStories)
      .where(eq(schema.commitmentStories.approved, false))
      .orderBy(desc(schema.commitmentStories.createdAt));
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// PATCH /admin/stories/:id/approve
router.patch('/stories/:id/approve', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });
    await db.update(schema.commitmentStories).set({ approved: true }).where(eq(schema.commitmentStories.id, id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /admin/stories/:id
router.delete('/stories/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });
    await db.delete(schema.commitmentStories).where(eq(schema.commitmentStories.id, id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /admin/applications/:id/status — update status, fire notification
router.patch('/applications/:id/status', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });
    const { status } = req.body;
    const valid = ['pending', 'reviewed', 'accepted', 'rejected'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, error: `status must be one of: ${valid.join(', ')}` });

    const updated = await db.update(schema.programApplications)
      .set({ status })
      .where(eq(schema.programApplications.id, id))
      .returning();

    if (updated[0]?.athleteId) {
      await db.insert(schema.notifications).values({
        playerId: updated[0].athleteId,
        type: 'application_status',
        actorName: 'HERS365 Recruiting',
      }).catch(() => {});
    }

    res.json({ success: true, data: updated[0] });
  } catch (err) { next(err); }
});

// GET /admin/scholarships
router.get('/scholarships', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db.select().from(schema.scholarships).orderBy(desc(schema.scholarships.id));
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// POST /admin/scholarships
router.post('/scholarships', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, amount, deadline, requirements, category, eligibleStates } = req.body;
    if (!name?.trim() || !amount || !deadline) {
      return res.status(400).json({ success: false, error: 'name, amount, and deadline are required' });
    }
    const inserted = await db.insert(schema.scholarships).values({
      name: name.trim(),
      amount: parseInt(String(amount), 10),
      deadline,
      requirements: requirements?.trim() || null,
      category: category?.trim() || null,
      eligibleStates: eligibleStates?.trim() || null,
    }).returning();
    res.json({ success: true, data: inserted[0] });
  } catch (err) { next(err); }
});

// PATCH /admin/scholarships/:id
router.patch('/scholarships/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });
    const { name, amount, deadline, requirements, category, eligibleStates } = req.body;
    const updates: Record<string, unknown> = {};
    if (name) updates.name = name.trim();
    if (amount !== undefined) updates.amount = parseInt(String(amount), 10);
    if (deadline) updates.deadline = deadline;
    if (requirements !== undefined) updates.requirements = requirements?.trim() || null;
    if (category !== undefined) updates.category = category?.trim() || null;
    if (eligibleStates !== undefined) updates.eligibleStates = eligibleStates?.trim() || null;
    const updated = await db.update(schema.scholarships).set(updates).where(eq(schema.scholarships.id, id)).returning();
    res.json({ success: true, data: updated[0] });
  } catch (err) { next(err); }
});

// DELETE /admin/scholarships/:id
router.delete('/scholarships/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });
    await db.delete(schema.scholarships).where(eq(schema.scholarships.id, id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
