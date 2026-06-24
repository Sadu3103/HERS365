// @ts-nocheck
/**
 * Admin Routes - Administrative functions for platform management
 */
import express from 'express';
import type { Request, Response } from 'express';
import { db } from './db';
import * as schema from './schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { requireAdmin } from './auth';
import { fetchAndExtract, getAIClient } from './lib/scraper';

const router = express.Router();

// ----------------------
// DASHBOARD STATS
// ----------------------

// GET /admin/stats - Get platform-wide statistics
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// USER MANAGEMENT
// ----------------------

// GET /admin/users - List all users with filters
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let users: any[] = [];
    let total = 0;

    if (role === 'player') {
      users = await db.select().from(schema.players).limit(Number(limit)).offset(offset);
      const count = await db.select({ count: sql<number>`count(*)::int` }).from(schema.players);
      total = count[0]?.count || 0;
    } else if (role === 'coach') {
      users = await db.select().from(schema.coaches).limit(Number(limit)).offset(offset);
      const count = await db.select({ count: sql<number>`count(*)::int` }).from(schema.coaches);
      total = count[0]?.count || 0;
    } else if (role === 'parent') {
      users = await db.select().from(schema.parents).limit(Number(limit)).offset(offset);
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
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/users/:id/verify - Verify a player
router.patch('/users/:id/verify', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    const updated = await db.update(schema.players)
      .set({ verificationStatus: status })
      .where(eq(schema.players.id, userId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/users/:id/subscription - Update user subscription
router.patch('/users/:id/subscription', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { tier } = req.body;

    const updated = await db.update(schema.players)
      .set({ subscriptionTier: tier })
      .where(eq(schema.players.id, userId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/users/:id - Delete a user
router.delete('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
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
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// CONTENT MODERATION
// ----------------------

// GET /admin/reports - Get reported content
router.get('/reports', requireAdmin, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/posts/:id/moderate - Moderate a post
router.patch('/posts/:id/moderate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
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
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// EVENT MANAGEMENT
// ----------------------

// POST /admin/events - Create an event
router.post('/events', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, date, location, registrationDeadline, participantCount } = req.body;

    const newEvent = await db.insert(schema.events).values({
      name,
      date: date ? new Date(date) : null,
      location,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      participantCount: participantCount || 0,
    }).returning();

    res.json(newEvent[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/events/:id - Update an event
router.patch('/events/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    const { name, date, location, registrationDeadline, participantCount } = req.body;

    const updated = await db.update(schema.events)
      .set({
        ...(name && { name }),
        ...(date && { date: new Date(date) }),
        ...(location && { location }),
        ...(registrationDeadline && { registrationDeadline: new Date(registrationDeadline) }),
        ...(participantCount && { participantCount }),
      })
      .where(eq(schema.events.id, eventId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/events/:id - Delete an event
router.delete('/events/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    await db.delete(schema.events).where(eq(schema.events.id, eventId));
    res.json({ success: true, message: 'Event deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// PAYMENT MANAGEMENT
// ----------------------

// GET /admin/payments - Get all payments
router.get('/payments', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = db.select({
      ...schema.payments,
      playerName: schema.players.name,
    })
      .from(schema.payments)
      .leftJoin(schema.players, eq(schema.payments.playerId, schema.players.id));

    if (status) {
      query = query.where(eq(schema.payments.status, status as string)) as any;
    }

    const payments = await query
      .orderBy(desc(schema.payments.createdAt))
      .limit(Number(limit))
      .offset(offset);

    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// BADGE MANAGEMENT
// ----------------------

// GET /admin/badges - Get all badges
router.get('/badges', requireAdmin, async (req: Request, res: Response) => {
  try {
    const badges = await db.select().from(schema.badges);
    res.json(badges);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/badges - Create a badge
router.post('/badges', requireAdmin, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// NIL OPPORTUNITIES
// ----------------------

// GET /admin/nil-opportunities - Get all NIL opportunities
router.get('/nil-opportunities', requireAdmin, async (req: Request, res: Response) => {
  try {
    const opportunities = await db.select().from(schema.nilOpportunities);
    res.json(opportunities);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/nil-opportunities - Create NIL opportunity
router.post('/nil-opportunities', requireAdmin, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// SUBSCRIPTION PLAN MANAGEMENT
// ----------------------

// GET /admin/subscription-plans - Get all subscription plans
router.get('/subscription-plans', requireAdmin, async (req: Request, res: Response) => {
  try {
    const plans = await db.select().from(schema.subscriptionPlans);
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/subscription-plans - Create a subscription plan
router.post('/subscription-plans', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, price, tierLevel } = req.body;

    const newPlan = await db.insert(schema.subscriptionPlans).values({
      name,
      price,
      tierLevel,
    }).returning();

    res.json(newPlan[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/subscription-plans/:id - Update a subscription plan
router.patch('/subscription-plans/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.id);
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
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/subscription-plans/:id - Delete a subscription plan
router.delete('/subscription-plans/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.id);
    await db.delete(schema.subscriptionPlans).where(eq(schema.subscriptionPlans.id, planId));
    res.json({ success: true, message: 'Subscription plan deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// ATHLETE VERIFICATION [B-29]
// ----------------------

// POST /admin/athletes/:id/verify - Verify an athlete profile
router.post('/athletes/:id/verify', requireAdmin, async (req: Request, res: Response) => {
  try {
    const athleteId = parseInt(req.params.id);
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

    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// COACH MANAGEMENT
// ----------------------

// GET /admin/coaches/verification - Get coaches pending verification
router.get('/coaches/verification', requireAdmin, async (req: Request, res: Response) => {
  try {
    const coaches = await db.select().from(schema.coaches)
      .where(eq(schema.coaches.verifiedStatus, false));
    res.json(coaches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/coaches/:id/verify - Verify a coach
router.patch('/coaches/:id/verify', requireAdmin, async (req: Request, res: Response) => {
  try {
    const coachId = parseInt(req.params.id);
    const { verified } = req.body;

    const updated = await db.update(schema.coaches)
      .set({ verifiedStatus: verified })
      .where(eq(schema.coaches.id, coachId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// TEAM MANAGEMENT
// ----------------------

// GET /admin/teams - Get all teams
router.get('/teams', requireAdmin, async (req: Request, res: Response) => {
  try {
    const teams = await db.select().from(schema.teams);
    res.json(teams);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/teams - Create a team
router.post('/teams', requireAdmin, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/teams/:id - Update a team
router.patch('/teams/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
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
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/teams/:id - Delete a team
router.delete('/teams/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    await db.delete(schema.teams).where(eq(schema.teams.id, teamId));
    res.json({ success: true, message: 'Team deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// RECRUITING — Programs, AI refresh, stories, applications, scholarships
// ──────────────────────────────────────────────────────────────────────────────

// GET /api/admin/programs — all programs with programDetails joined
router.get('/programs', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: schema.teams.id,
        name: schema.teams.name,
        division: schema.teams.division,
        conference: schema.teams.conference,
        city: schema.teams.city,
        state: schema.teams.state,
        websiteUrl: schema.programDetails.websiteUrl,
        hasScholarships: schema.programDetails.hasScholarships,
        lastScrapedAt: schema.programDetails.lastScrapedAt,
        staffCount: sql<number>`(select count(*)::int from program_staff where team_id = teams.id)`,
      })
      .from(schema.teams)
      .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
      .where(eq(schema.teams.type, 'college'));

    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/programs/:teamId/refresh — AI re-scrape in expanded mode
router.post('/programs/:teamId/refresh', requireAdmin, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);
    if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid teamId' });

    if (!getAIClient()) return res.status(503).json({ error: 'No AI backend configured' });

    const teamRows = await db.select({ id: schema.teams.id, name: schema.teams.name })
      .from(schema.teams).where(eq(schema.teams.id, teamId)).limit(1);
    if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });

    const detailRows = await db.select({ websiteUrl: schema.programDetails.websiteUrl })
      .from(schema.programDetails).where(eq(schema.programDetails.teamId, teamId)).limit(1);
    if (!detailRows[0]?.websiteUrl) return res.status(404).json({ error: 'No website URL for this team' });

    const result = await fetchAndExtract(
      { id: teamId, name: teamRows[0].name, website: detailRows[0].websiteUrl },
      { expanded: true }
    );

    await db.update(schema.programDetails)
      .set({ lastScrapedAt: new Date(), scrapedDataRaw: result as any, updatedAt: new Date() })
      .where(eq(schema.programDetails.teamId, teamId));

    await db.delete(schema.programStaff).where(eq(schema.programStaff.teamId, teamId));
    if (result.staff.length > 0) {
      await db.insert(schema.programStaff).values(
        result.staff.map((m: any) => ({
          teamId, name: m.name, title: m.title, email: m.email, phone: m.phone,
          scrapedAt: new Date(), scrapedFrom: detailRows[0].websiteUrl,
        }))
      );
    }

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/programs/refresh-all — background re-scrape of all programs
router.post('/programs/refresh-all', requireAdmin, async (_req: Request, res: Response) => {
  if (!getAIClient()) return res.status(503).json({ error: 'No AI backend configured' });

  const allSchools = await db
    .select({ id: schema.teams.id, name: schema.teams.name, websiteUrl: schema.programDetails.websiteUrl })
    .from(schema.teams)
    .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
    .where(eq(schema.teams.type, 'college'));

  res.json({ success: true, message: `Refreshing ${allSchools.length} programs in background` });

  for (const s of allSchools) {
    if (!s.websiteUrl) continue;
    try {
      const result = await fetchAndExtract({ id: s.id, name: s.name, website: s.websiteUrl }, { expanded: true });
      await db.update(schema.programDetails)
        .set({ lastScrapedAt: new Date(), scrapedDataRaw: result as any, updatedAt: new Date() })
        .where(eq(schema.programDetails.teamId, s.id));
      if (result.staff.length > 0) {
        await db.delete(schema.programStaff).where(eq(schema.programStaff.teamId, s.id));
        await db.insert(schema.programStaff).values(
          result.staff.map((m: any) => ({ teamId: s.id, name: m.name, title: m.title, email: m.email, phone: m.phone, scrapedAt: new Date(), scrapedFrom: s.websiteUrl }))
        );
      }
    } catch { /* continue on failure */ }
    await new Promise(r => setTimeout(r, 600));
  }
});

// GET /api/admin/ai-status — check if Ollama or OpenAI is configured
router.get('/ai-status', requireAdmin, async (_req: Request, res: Response) => {
  const ai = getAIClient();
  if (!ai) return res.json({ available: false, model: null, backend: null });

  if (ai.isOllama) {
    try {
      const resp = await fetch(`${process.env.OLLAMA_BASE_URL}/api/tags`).catch(() => null);
      return res.json({ available: !!resp?.ok, model: ai.model, backend: 'ollama' });
    } catch {
      return res.json({ available: false, model: ai.model, backend: 'ollama' });
    }
  }

  res.json({ available: true, model: ai.model, backend: 'openai' });
});

// ── Stories (commitment stories moderation) ────────────────────────────────────

router.get('/stories/pending', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(schema.commitmentStories)
      .where(eq(schema.commitmentStories.approved, false))
      .orderBy(desc(schema.commitmentStories.createdAt));
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/stories/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await db.update(schema.commitmentStories)
      .set({ approved: true }).where(eq(schema.commitmentStories.id, id)).returning();
    if (!updated[0]) return res.status(404).json({ error: 'Story not found' });
    res.json({ success: true, data: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/stories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(schema.commitmentStories).where(eq(schema.commitmentStories.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Application status management ──────────────────────────────────────────────

router.patch('/applications/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const valid = ['pending', 'reviewed', 'accepted', 'rejected'];
    if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });

    const updated = await db.update(schema.programApplications)
      .set({ status }).where(eq(schema.programApplications.id, id)).returning();
    if (!updated[0]) return res.status(404).json({ error: 'Application not found' });

    // Notify the athlete
    const athleteId = updated[0].athleteId;
    if (athleteId) {
      const teamRows = await db.select({ name: schema.teams.name })
        .from(schema.teams).where(eq(schema.teams.id, updated[0].programId!)).limit(1);
      const schoolName = teamRows[0]?.name || 'a program';
      await db.insert(schema.notifications).values({
        playerId: athleteId,
        type: 'coach_interest',
        actorName: `${schoolName} — application ${status}`,
      }).catch(() => {});
    }

    res.json({ success: true, data: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Scholarship CRUD ───────────────────────────────────────────────────────────

router.get('/scholarships', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(schema.scholarships).orderBy(desc(schema.scholarships.createdAt));
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/scholarships', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, amount, deadline, requirements, category, eligibleStates } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!amount || isNaN(Number(amount))) return res.status(400).json({ error: 'amount must be a number' });
    if (!deadline?.trim()) return res.status(400).json({ error: 'deadline is required' });

    const inserted = await db.insert(schema.scholarships).values({
      name: name.trim(), amount: parseInt(amount), deadline: deadline.trim(),
      requirements: requirements?.trim() || null, category: category?.trim() || null,
      eligibleStates: eligibleStates?.trim() || null,
    }).returning();
    res.json({ success: true, data: inserted[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/scholarships/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, amount, deadline, requirements, category, eligibleStates } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (amount !== undefined) updates.amount = parseInt(amount);
    if (deadline !== undefined) updates.deadline = deadline.trim();
    if (requirements !== undefined) updates.requirements = requirements?.trim() || null;
    if (category !== undefined) updates.category = category?.trim() || null;
    if (eligibleStates !== undefined) updates.eligibleStates = eligibleStates?.trim() || null;

    const updated = await db.update(schema.scholarships).set(updates)
      .where(eq(schema.scholarships.id, id)).returning();
    if (!updated[0]) return res.status(404).json({ error: 'Scholarship not found' });
    res.json({ success: true, data: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/scholarships/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(schema.scholarships).where(eq(schema.scholarships.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
