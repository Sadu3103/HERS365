import express from 'express';
import { and, eq, sql, gte, lt } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../auth';

const router = express.Router();
router.use(requireAuth);

function caller(req: express.Request) {
  const u = (req as any).user;
  return { userId: Number(u.userId), role: u.role as string };
}

// GET /api/training/programs - list programs, with per-athlete progress if enrolled
router.get('/programs', async (req, res) => {
  try {
    const { userId } = caller(req);
    const { category, level, limit = '20' } = req.query as Record<string, string>;

    const conditions = [];
    if (category && category !== 'All') conditions.push(eq(schema.trainingPrograms.category, category));
    if (level && level !== 'All') conditions.push(eq(schema.trainingPrograms.level, level));

    const programs = await db
      .select()
      .from(schema.trainingPrograms)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(Number(limit));

    // Pull this athlete's enrollments + completed session counts in two queries,
    // then merge in JS rather than per-program round trips.
    const enrollments = await db
      .select({ programId: schema.athleteEnrollments.programId })
      .from(schema.athleteEnrollments)
      .where(eq(schema.athleteEnrollments.athleteId, userId));
    const enrolledIds = new Set(enrollments.map((e) => e.programId));

    const completions = await db
      .select({
        sessionId: schema.athleteSessionCompletions.sessionId,
        programId: schema.trainingSessions.programId,
      })
      .from(schema.athleteSessionCompletions)
      .innerJoin(schema.trainingSessions, eq(schema.athleteSessionCompletions.sessionId, schema.trainingSessions.id))
      .where(eq(schema.athleteSessionCompletions.athleteId, userId));

    const completedByProgram = new Map<number, number>();
    for (const c of completions) {
      completedByProgram.set(c.programId, (completedByProgram.get(c.programId) ?? 0) + 1);
    }

    const data = programs.map((p) => {
      const completedSessions = completedByProgram.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        duration: p.duration,
        level: p.level,
        category: p.category,
        totalSessions: p.totalSessions,
        completedSessions,
        progress: p.totalSessions ? Math.round((completedSessions / p.totalSessions) * 100) : 0,
        image: p.image,
        exercises: p.exercises ?? [],
        enrolled: enrolledIds.has(p.id),
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[training/programs]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training programs' });
  }
});

// GET /api/training/programs/:id
router.get('/programs/:id', async (req, res) => {
  try {
    const { userId } = caller(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const [program] = await db.select().from(schema.trainingPrograms).where(eq(schema.trainingPrograms.id, id)).limit(1);
    if (!program) return res.status(404).json({ success: false, error: 'Training program not found' });

    const completed = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.athleteSessionCompletions)
      .innerJoin(schema.trainingSessions, eq(schema.athleteSessionCompletions.sessionId, schema.trainingSessions.id))
      .where(and(
        eq(schema.athleteSessionCompletions.athleteId, userId),
        eq(schema.trainingSessions.programId, id),
      ));

    const completedSessions = Number(completed[0]?.count ?? 0);

    res.json({
      success: true,
      data: {
        ...program,
        completedSessions,
        progress: program.totalSessions ? Math.round((completedSessions / program.totalSessions) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('[training/programs/:id]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training program' });
  }
});

// GET /api/training/sessions - sessions for a program, with this athlete's completion state
router.get('/sessions', async (req, res) => {
  try {
    const { userId } = caller(req);
    const { programId, completed, limit = '20' } = req.query as Record<string, string>;

    const conditions = [];
    if (programId) conditions.push(eq(schema.trainingSessions.programId, parseInt(programId, 10)));

    const sessions = await db
      .select()
      .from(schema.trainingSessions)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(Number(limit));

    const completions = await db
      .select({ sessionId: schema.athleteSessionCompletions.sessionId })
      .from(schema.athleteSessionCompletions)
      .where(eq(schema.athleteSessionCompletions.athleteId, userId));
    const completedIds = new Set(completions.map((c) => c.sessionId));

    let data = sessions.map((s) => ({
      id: s.id,
      name: s.name,
      programId: s.programId,
      exercises: s.exercises ?? [],
      duration: s.duration,
      date: s.date,
      completed: completedIds.has(s.id),
    }));

    if (completed !== undefined) {
      const want = completed === 'true';
      data = data.filter((s) => s.completed === want);
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('[training/sessions]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training sessions' });
  }
});

// GET /api/training/sessions/today
router.get('/sessions/today', async (req, res) => {
  try {
    const { userId } = caller(req);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const sessions = await db
      .select()
      .from(schema.trainingSessions)
      .where(and(gte(schema.trainingSessions.date, startOfDay), lt(schema.trainingSessions.date, endOfDay)));

    const completions = await db
      .select({ sessionId: schema.athleteSessionCompletions.sessionId })
      .from(schema.athleteSessionCompletions)
      .where(eq(schema.athleteSessionCompletions.athleteId, userId));
    const completedIds = new Set(completions.map((c) => c.sessionId));

    const data = sessions
      .filter((s) => !completedIds.has(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        programId: s.programId,
        exercises: s.exercises ?? [],
        duration: s.duration,
        date: s.date,
        completed: false,
      }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('[training/sessions/today]', error);
    res.status(500).json({ success: false, error: "Failed to fetch today's sessions" });
  }
});

// PUT /api/training/sessions/:id/complete
router.put('/sessions/:id/complete', async (req, res) => {
  try {
    const { userId } = caller(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const [session] = await db.select().from(schema.trainingSessions).where(eq(schema.trainingSessions.id, id)).limit(1);
    if (!session) return res.status(404).json({ success: false, error: 'Training session not found' });

    const existing = await db
      .select({ id: schema.athleteSessionCompletions.id })
      .from(schema.athleteSessionCompletions)
      .where(and(
        eq(schema.athleteSessionCompletions.athleteId, userId),
        eq(schema.athleteSessionCompletions.sessionId, id),
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.athleteSessionCompletions).values({
        athleteId: userId,
        sessionId: id,
        notes: req.body?.notes ? String(req.body.notes).slice(0, 1000) : null,
      });
    }

    res.json({ success: true, data: { ...session, completed: true } });
  } catch (error) {
    console.error('[training/sessions/:id/complete]', error);
    res.status(500).json({ success: false, error: 'Failed to complete session' });
  }
});

// GET /api/training/progress - per-athlete progress summary
router.get('/progress', async (req, res) => {
  try {
    const { userId } = caller(req);

    const enrollments = await db
      .select({ programId: schema.athleteEnrollments.programId })
      .from(schema.athleteEnrollments)
      .where(eq(schema.athleteEnrollments.athleteId, userId));
    const enrolledIds = enrollments.map((e) => e.programId);

    if (enrolledIds.length === 0) {
      return res.json({
        success: true,
        data: {
          programs: { total: 0, active: 0, completed: 0, averageProgress: 0 },
          weekly: { workoutsCompleted: 0, totalTrainingTime: 0 },
        },
      });
    }

    const programs = await db.select().from(schema.trainingPrograms);
    const enrolledPrograms = programs.filter((p) => enrolledIds.includes(p.id));

    const completions = await db
      .select({
        sessionId: schema.athleteSessionCompletions.sessionId,
        completedAt: schema.athleteSessionCompletions.completedAt,
        programId: schema.trainingSessions.programId,
        duration: schema.trainingSessions.duration,
      })
      .from(schema.athleteSessionCompletions)
      .innerJoin(schema.trainingSessions, eq(schema.athleteSessionCompletions.sessionId, schema.trainingSessions.id))
      .where(eq(schema.athleteSessionCompletions.athleteId, userId));

    const completedByProgram = new Map<number, number>();
    for (const c of completions) {
      completedByProgram.set(c.programId, (completedByProgram.get(c.programId) ?? 0) + 1);
    }

    const programProgress = enrolledPrograms.map((p) => {
      const done = completedByProgram.get(p.id) ?? 0;
      return p.totalSessions ? Math.round((done / p.totalSessions) * 100) : 0;
    });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCompletions = completions.filter((c) => new Date(c.completedAt) >= weekAgo);

    res.json({
      success: true,
      data: {
        programs: {
          total: enrolledPrograms.length,
          active: programProgress.filter((p) => p < 100).length,
          completed: programProgress.filter((p) => p === 100).length,
          averageProgress: programProgress.length
            ? Math.round(programProgress.reduce((s, p) => s + p, 0) / programProgress.length)
            : 0,
        },
        weekly: {
          workoutsCompleted: weekCompletions.length,
          totalTrainingTime: weekCompletions.reduce((sum, c) => sum + (c.duration ?? 0), 0),
        },
      },
    });
  } catch (error) {
    console.error('[training/progress]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training progress' });
  }
});

// POST /api/training/programs/:id/enroll - actually persists enrollment now
router.post('/programs/:id/enroll', async (req, res) => {
  try {
    const { userId } = caller(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const [program] = await db.select().from(schema.trainingPrograms).where(eq(schema.trainingPrograms.id, id)).limit(1);
    if (!program) return res.status(404).json({ success: false, error: 'Training program not found' });

    const existing = await db
      .select({ id: schema.athleteEnrollments.id })
      .from(schema.athleteEnrollments)
      .where(and(eq(schema.athleteEnrollments.athleteId, userId), eq(schema.athleteEnrollments.programId, id)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.athleteEnrollments).values({ athleteId: userId, programId: id });
    }

    res.json({ success: true, message: `Successfully enrolled in ${program.name}`, data: program });
  } catch (error) {
    console.error('[training/enroll]', error);
    res.status(500).json({ success: false, error: 'Failed to enroll in program' });
  }
});

export { router as trainingRouter };