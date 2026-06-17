import express from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../auth';

const router = express.Router();

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
    const { category, level, limit = 20 } = req.query;

    let filteredPrograms = [...mockPrograms];

    if (category && category !== 'All') {
      filteredPrograms = filteredPrograms.filter(p => p.category === category);
    }

    if (level && level !== 'All') {
      filteredPrograms = filteredPrograms.filter(p => p.level === level);
    }

    filteredPrograms = filteredPrograms.slice(0, Number(limit));

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
    const { programId, completed, limit = 20 } = req.query;

    let filteredSessions = [...mockSessions];

    if (programId) {
      filteredSessions = filteredSessions.filter(s => s.programId === parseInt(programId.toString()));
    }

    if (completed !== undefined) {
      filteredSessions = filteredSessions.filter(s => s.completed === (completed === 'true'));
    }

    filteredSessions = filteredSessions.slice(0, Number(limit));

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

router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const playerId = Number((req as any).user.id);
    const { name, category, duration, notes, completedAt } = req.body ?? {};
    const minutes = Number(duration);

    if (!name || Number.isNaN(minutes) || minutes <= 0) {
      return res.status(400).json({
        success: false,
        error: 'name and a positive duration are required',
      });
    }

    const [session] = await db
      .insert(schema.personalTrainingSessions)
      .values({
        playerId,
        name: String(name),
        category: category ? String(category) : null,
        duration: Math.round(minutes),
        notes: notes ? String(notes) : null,
        completedAt: completedAt ? new Date(String(completedAt)) : new Date(),
      })
      .returning();

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('[training/sessions/create]', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log training session',
    });
  }
});

router.get('/sessions/personal', requireAuth, async (req, res) => {
  try {
    const playerId = Number((req as any).user.id);
    const rows = await db
      .select()
      .from(schema.personalTrainingSessions)
      .where(eq(schema.personalTrainingSessions.playerId, playerId))
      .orderBy(desc(schema.personalTrainingSessions.completedAt));

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('[training/sessions/personal]', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch personal training sessions',
    });
  }
});

export { router as trainingRouter };