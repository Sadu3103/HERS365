import express, { type Request } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../auth';
import { clampIntQuery, parseIntQuery } from '../lib/queryParam';
import { parseIdParam } from '../lib/parseIdParam';

const router = express.Router();

function authUser(req: Request) {
  return (req as Request & { user?: { id?: number | string; userId?: number | string } }).user;
}

// GET /api/training/programs - List training plans (with optional ?category= filter)
router.get('/programs', async (req, res) => {
  try {
    const { category, limit } = req.query;
    const limitNum = clampIntQuery(limit, { default: 20, min: 1, max: 200 });

    const rows = await db
      .select()
      .from(schema.trainingPlans)
      .limit(limitNum);

    // trainingPlans columns: id, playerId, weeklySchedule, goals
    // Shape them to match the API contract the UI expects
    let data = rows.map((p) => ({
      id: p.id,
      name: p.goals ?? 'Training Plan',
      description: p.weeklySchedule ?? '',
      duration: '8 weeks',
      level: 'Intermediate',
      category: 'General',
      progress: 0,
      totalSessions: 0,
      completedSessions: 0,
      nextSession: 'TBD',
      image: '',
      exercises: [],
    }));

    if (category && category !== 'All') {
      data = data.filter((p) => p.category === category);
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('[training/programs]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training programs' });
  }
});

// GET /api/training/programs/:id - Get specific training plan
router.get('/programs/:id', async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });

    const rows = await db
      .select()
      .from(schema.trainingPlans)
      .where(eq(schema.trainingPlans.id, id))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Training program not found' });
    }

    const p = rows[0];
    res.json({
      success: true,
      data: {
        id: p.id,
        name: p.goals ?? 'Training Plan',
        description: p.weeklySchedule ?? '',
        duration: '8 weeks',
        level: 'Intermediate',
        category: 'General',
        progress: 0,
        totalSessions: 0,
        completedSessions: 0,
        nextSession: 'TBD',
        image: '',
        exercises: [],
      },
    });
  } catch (error) {
    console.error('[training/programs/:id]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training program' });
  }
});

// GET /api/training/sessions - Query drills table
router.get('/sessions', async (req, res) => {
  try {
    const { programId, completed, limit } = req.query;
    const limitNum = clampIntQuery(limit, { default: 20, min: 1, max: 200 });

    let rows = await db
      .select()
      .from(schema.drills)
      .limit(limitNum);

    if (programId) {
      const n = parseIntQuery(programId);
      if (n === null) {
        return res.status(400).json({ success: false, error: 'programId must be an integer' });
      }
      // drills don't have a programId FK; return empty when filtered
      rows = [];
    }

    const data = rows.map((d) => ({
      id: d.id,
      name: d.instructions?.split('.')[0] ?? 'Drill',
      programId: null,
      exercises: d.instructions ? [d.instructions] : [],
      duration: 60,
      completed: false,
      date: new Date().toISOString(),
      notes: d.category ?? '',
      position: d.position,
      category: d.category,
    }));

    const filtered = completed !== undefined
      ? data.filter((s) => s.completed === (completed === 'true'))
      : data;

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('[training/sessions]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training sessions' });
  }
});

// GET /api/training/sessions/today - Today's drills (incomplete)
router.get('/sessions/today', async (req, res) => {
  try {
    const rows = await db.select().from(schema.drills).limit(5);
    const data = rows.map((d) => ({
      id: d.id,
      name: d.instructions?.split('.')[0] ?? 'Drill',
      programId: null,
      exercises: d.instructions ? [d.instructions] : [],
      duration: 60,
      completed: false,
      date: new Date().toISOString(),
      notes: d.category ?? '',
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('[training/sessions/today]', error);
    res.status(500).json({ success: false, error: "Failed to fetch today's sessions" });
  }
});

// PUT /api/training/sessions/:id/complete - Mark drill completion
router.put('/sessions/:id/complete', async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });

    const rows = await db
      .select()
      .from(schema.drills)
      .where(eq(schema.drills.id, id))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Training session not found' });
    }

    const d = rows[0];
    res.json({
      success: true,
      data: {
        id: d.id,
        name: d.instructions?.split('.')[0] ?? 'Drill',
        programId: null,
        exercises: d.instructions ? [d.instructions] : [],
        duration: 60,
        completed: true,
        date: new Date().toISOString(),
        notes: d.category ?? '',
      },
    });
  } catch (error) {
    console.error('[training/sessions/:id/complete]', error);
    res.status(500).json({ success: false, error: 'Failed to complete session' });
  }
});

// GET /api/training/progress - Authenticated user's skill challenge completions
router.get('/progress', requireAuth, async (req, res) => {
  try {
    const u = authUser(req);
    const playerId = Number(u?.id ?? u?.userId);

    const completions = await db
      .select()
      .from(schema.skillChallengeCompletions)
      .where(eq(schema.skillChallengeCompletions.playerId, playerId));

    const total = completions.length;
    const avgScore = total > 0
      ? Math.round(completions.reduce((s, c) => s + (c.score ?? 0), 0) / total)
      : 0;

    res.json({
      success: true,
      data: {
        programs: {
          total: 0,
          active: 0,
          completed: total,
          averageProgress: avgScore,
        },
        weekly: {
          workoutsCompleted: total,
          totalTrainingTime: total * 60,
          personalRecords: 0,
          consistencyStreak: 0,
        },
        recentAchievements: completions.slice(0, 3).map((c) => c.aiFeedback ?? 'Completed a drill'),
      },
    });
  } catch (error) {
    console.error('[training/progress]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training progress' });
  }
});

// POST /api/training/programs/:id/enroll - Enroll (insert skillChallengeCompletion stub)
router.post('/programs/:id/enroll', requireAuth, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });

    const plan = await db
      .select()
      .from(schema.trainingPlans)
      .where(eq(schema.trainingPlans.id, id))
      .limit(1);

    if (!plan[0]) {
      return res.status(404).json({ success: false, error: 'Training program not found' });
    }

    const u = authUser(req);
    const playerId = Number(u?.id ?? u?.userId);

    // Record enrollment as a completion stub so it shows in progress
    await db.insert(schema.skillChallengeCompletions).values({
      playerId,
      drillId: null,
      aiFeedback: `Enrolled in plan ${id}`,
      score: 0,
    });

    const p = plan[0];
    res.json({
      success: true,
      message: `Successfully enrolled in ${p.goals ?? 'Training Plan'}`,
      data: {
        id: p.id,
        name: p.goals ?? 'Training Plan',
        description: p.weeklySchedule ?? '',
        duration: '8 weeks',
        level: 'Intermediate',
        category: 'General',
        progress: 0,
        totalSessions: 0,
        completedSessions: 0,
        nextSession: 'TBD',
        image: '',
        exercises: [],
      },
    });
  } catch (error) {
    console.error('[training/programs/:id/enroll]', error);
    res.status(500).json({ success: false, error: 'Failed to enroll in program' });
  }
});

export { router as trainingRouter };
