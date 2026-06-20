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
    const { role, page = 1, limit = 20, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let users: any[] = [];
    let total = 0;

    // Even on admin endpoints we never ship bcrypt hashes back to the
    // client. They have no operational use in a dashboard and the row was
    // already loaded with .select() so the hash is in memory.
    if (role === 'player') {
      const rows = await db.select().from(schema.players).limit(Number(limit)).offset(offset);
      users = rows.map(withoutPasswordHash);
      const count = await db.select({ count: sql<number>`count(*)::int` }).from(schema.players);
      total = count[0]?.count || 0;
    } else if (role === 'coach') {
      const rows = await db.select().from(schema.coaches).limit(Number(limit)).offset(offset);
      users = rows.map(withoutPasswordHash);
      const count = await db.select({ count: sql<number>`count(*)::int` }).from(schema.coaches);
      total = count[0]?.count || 0;
    } else if (role === 'parent') {
      const rows = await db.select().from(schema.parents).limit(Number(limit)).offset(offset);
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
      }).from(schema.players).limit(Number(limit)).offset(offset);
      
      users = players;
      const count = await db.select({ count: sql<number>`count(*)::int` }).from(schema.players);
      total = count[0]?.count || 0;
    }

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err: any) {
    next(err);
  }
});

// PATCH /admin/users/:id/verify - Verify a player
router.patch('/users/:id/verify', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(String(req.params.id));
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
    const userId = parseInt(String(req.params.id));
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
    const userId = parseInt(String(req.params.id));
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
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Get flagged posts for moderation
    const posts = await db.select()
      .from(schema.posts)
      .where(eq(schema.posts.moderationStatus, 'flagged'))
      .limit(Number(limit))
      .offset(offset);

    const count = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.posts)
      .where(eq(schema.posts.moderationStatus, 'flagged'));

    res.json({
      reports: posts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
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
    const postId = parseInt(String(req.params.id));
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
    const eventId = parseInt(String(req.params.id));
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
    const eventId = parseInt(String(req.params.id));
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
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

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
      .limit(Number(limit))
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
    const planId = parseInt(String(req.params.id));
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
    const planId = parseInt(String(req.params.id));
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
    const athleteId = parseInt(String(req.params.id));
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
    const coachId = parseInt(String(req.params.id));
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
    const teamId = parseInt(String(req.params.id));
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
    const teamId = parseInt(String(req.params.id));
    await db.delete(schema.teams).where(eq(schema.teams.id, teamId));
    res.json({ success: true, message: 'Team deleted' });
  } catch (err: any) {
    next(err);
  }
});

export default router;
