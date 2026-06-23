import express from 'express';
import { eq, desc } from 'drizzle-orm';
import { clampIntQuery, parseIntQuery } from '../lib/queryParam';
import { requireAuth } from '../auth';
import { db } from '../db';
import * as schema from '../schema';

const router = express.Router();

const VALID_INTENSITY = ['low', 'moderate', 'high'];

// Mock data for training programs and sessions
const mockPrograms = [
  {
    id: 1,
    name: 'Elite QB Development',
    description: 'Comprehensive quarterback training program focusing on accuracy, decision-making, and leadership.',
    duration: '12 weeks',
    level: 'Advanced',
    category: 'Position Specific',
    progress: 75,
    totalSessions: 36,
    completedSessions: 27,
    nextSession: 'Tomorrow',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=400',
    exercises: [
      'Drop back drills',
      'Target practice',
      'Decision training',
      'Leadership exercises'
    ]
  },
  {
    id: 2,
    name: 'Speed & Agility Mastery',
    description: 'Advanced training for explosive speed, quick directional changes, and footwork.',
    duration: '8 weeks',
    level: 'Elite',
    category: 'Athletic Development',
    progress: 60,
    totalSessions: 24,
    completedSessions: 14,
    nextSession: 'Today',
    image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&q=80&w=400',
    exercises: [
      '40-yard dashes',
      'Agility ladder',
      'Hill sprints',
      'Plyometrics'
    ]
  }
];

const mockSessions = [
  {
    id: 1,
    name: 'QB Footwork & Accuracy',
    programId: 1,
    exercises: ['Drop back drills', 'Target practice', 'Decision training'],
    duration: 90,
    completed: false,
    date: new Date().toISOString(),
    notes: 'Focus on footwork mechanics'
  },
  {
    id: 2,
    name: 'Speed Training',
    programId: 2,
    exercises: ['40-yard dashes', 'Agility ladder', 'Hill sprints'],
    duration: 60,
    completed: true,
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Great session, PB on 40-yard dash!'
  }
];

// GET /api/training/programs - Get all training programs
router.get('/programs', (req, res) => {
  try {
    const { category, level, limit } = req.query;
    const limitNum = clampIntQuery(limit, { default: 20, min: 1, max: 200 });

    let filteredPrograms = [...mockPrograms];

    if (category && category !== 'All') {
      filteredPrograms = filteredPrograms.filter(p => p.category === category);
    }

    if (level && level !== 'All') {
      filteredPrograms = filteredPrograms.filter(p => p.level === level);
    }

    filteredPrograms = filteredPrograms.slice(0, limitNum);

    res.json({
      success: true,
      data: filteredPrograms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training programs'
    });
  }
});

// GET /api/training/programs/:id - Get specific training program
router.get('/programs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const program = mockPrograms.find(p => p.id === parseInt(id));

    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Training program not found'
      });
    }

    res.json({
      success: true,
      data: program
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training program'
    });
  }
});

// GET /api/training/sessions - Get training sessions
router.get('/sessions', (req, res) => {
  try {
    const { programId, completed, limit } = req.query;
    const limitNum = clampIntQuery(limit, { default: 20, min: 1, max: 200 });

    let filteredSessions = [...mockSessions];

    if (programId) {
      const n = parseIntQuery(programId);
      if (n === null) {
        return res.status(400).json({ success: false, error: 'programId must be an integer' });
      }
      filteredSessions = filteredSessions.filter(s => s.programId === n);
    }

    if (completed !== undefined) {
      filteredSessions = filteredSessions.filter(s => s.completed === (completed === 'true'));
    }

    filteredSessions = filteredSessions.slice(0, limitNum);

    res.json({
      success: true,
      data: filteredSessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training sessions'
    });
  }
});

// [F-37] POST /api/training/sessions — athlete logs a completed personal session.
// Real DB write to athlete_sessions, scoped to req.user.userId.
router.post('/sessions', requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user?.role !== 'athlete') {
    return res.status(403).json({ success: false, error: 'Only athletes can log training sessions' });
  }

  const { activity, durationMinutes, intensity, notes, sessionDate, programId } = req.body ?? {};

  if (typeof activity !== 'string' || !activity.trim()) {
    return res.status(400).json({ success: false, error: 'activity is required' });
  }
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration <= 0 || duration > 1440) {
    return res.status(400).json({ success: false, error: 'durationMinutes must be a positive integer up to 1440' });
  }
  if (intensity !== undefined && intensity !== null && !VALID_INTENSITY.includes(intensity)) {
    return res.status(400).json({ success: false, error: "intensity must be 'low', 'moderate', or 'high'" });
  }
  let programIdVal: number | null = null;
  if (programId !== undefined && programId !== null && programId !== '') {
    programIdVal = parseIntQuery(programId);
    if (programIdVal === null) {
      return res.status(400).json({ success: false, error: 'programId must be an integer' });
    }
  }
  let when = new Date();
  if (sessionDate !== undefined) {
    when = new Date(sessionDate);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ success: false, error: 'sessionDate is not a valid date' });
    }
  }

  try {
    const [row] = await db.insert(schema.athleteSessions).values({
      playerId: user.userId ?? user.id,
      programId: programIdVal,
      activity: activity.trim().slice(0, 200),
      durationMinutes: duration,
      intensity: intensity ?? null,
      notes: notes ? String(notes).slice(0, 2000) : null,
      sessionDate: when,
    }).returning();

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('[training/sessions POST]', error);
    res.status(500).json({ success: false, error: 'Failed to log training session' });
  }
});

// [F-37] GET /api/training/sessions/me — the authed athlete's logged sessions.
router.get('/sessions/me', requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user?.role !== 'athlete') {
    return res.status(403).json({ success: false, error: 'Only athletes have a training log' });
  }
  const limitNum = clampIntQuery(req.query.limit, { default: 50, min: 1, max: 200 });
  try {
    const rows = await db
      .select()
      .from(schema.athleteSessions)
      .where(eq(schema.athleteSessions.playerId, user.userId ?? user.id))
      .orderBy(desc(schema.athleteSessions.sessionDate))
      .limit(limitNum);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[training/sessions/me GET]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training log' });
  }
});

// [F-37] PATCH /api/training/programs/:id/progress — athlete updates their
// completion percentage for a program. Upserts athlete_program_progress.
router.patch('/programs/:id/progress', requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user?.role !== 'athlete') {
    return res.status(403).json({ success: false, error: 'Only athletes can track program progress' });
  }
  const programId = parseIntQuery(req.params.id);
  if (programId === null) {
    return res.status(400).json({ success: false, error: 'program id must be an integer' });
  }
  const percent = Number(req.body?.percentComplete);
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    return res.status(400).json({ success: false, error: 'percentComplete must be an integer from 0 to 100' });
  }

  const playerId = user.userId ?? user.id;
  try {
    const [row] = await db
      .insert(schema.athleteProgramProgress)
      .values({ playerId, programId, percentComplete: percent })
      .onConflictDoUpdate({
        target: [schema.athleteProgramProgress.playerId, schema.athleteProgramProgress.programId],
        set: { percentComplete: percent, updatedAt: new Date() },
      })
      .returning();
    res.json({ success: true, data: row });
  } catch (error) {
    console.error('[training/programs/:id/progress PATCH]', error);
    res.status(500).json({ success: false, error: 'Failed to update program progress' });
  }
});

// GET /api/training/sessions/today - Get today's training sessions
router.get('/sessions/today', (req, res) => {
  try {
    const today = new Date().toDateString();
    const todaySessions = mockSessions.filter(session => {
      const sessionDate = new Date(session.date).toDateString();
      return sessionDate === today && !session.completed;
    });

    res.json({
      success: true,
      data: todaySessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s sessions'
    });
  }
});

// PUT /api/training/sessions/:id/complete - Mark session as completed
router.put('/sessions/:id/complete', (req, res) => {
  try {
    const { id } = req.params;
    const session = mockSessions.find(s => s.id === parseInt(id));

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Training session not found'
      });
    }

    session.completed = true;

    // Update program progress
    const program = mockPrograms.find(p => p.id === session.programId);
    if (program) {
      const completedInProgram = mockSessions.filter(s =>
        s.programId === program.id && s.completed
      ).length;
      program.completedSessions = completedInProgram;
      program.progress = Math.round((completedInProgram / program.totalSessions) * 100);
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to complete session'
    });
  }
});

// GET /api/training/progress - Get overall training progress
router.get('/progress', (req, res) => {
  try {
    const totalPrograms = mockPrograms.length;
    const activePrograms = mockPrograms.filter(p => p.progress < 100).length;
    const completedPrograms = mockPrograms.filter(p => p.progress === 100).length;
    const averageProgress = mockPrograms.reduce((sum, p) => sum + p.progress, 0) / totalPrograms;

    const weeklyStats = {
      workoutsCompleted: 5,
      totalTrainingTime: 450, // minutes
      personalRecords: 3,
      consistencyStreak: 12
    };

    res.json({
      success: true,
      data: {
        programs: {
          total: totalPrograms,
          active: activePrograms,
          completed: completedPrograms,
          averageProgress: Math.round(averageProgress)
        },
        weekly: weeklyStats,
        recentAchievements: [
          'Completed 10 training sessions this week',
          'New personal record in 40-yard dash',
          'Perfect attendance for 2 weeks'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training progress'
    });
  }
});

// POST /api/training/programs/:id/enroll - Enroll in a training program
router.post('/programs/:id/enroll', (req, res) => {
  try {
    const { id } = req.params;
    const program = mockPrograms.find(p => p.id === parseInt(id));

    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Training program not found'
      });
    }

    // In a real app, you'd associate this with the user
    res.json({
      success: true,
      message: `Successfully enrolled in ${program.name}`,
      data: program
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to enroll in program'
    });
  }
});

export { router as trainingRouter };