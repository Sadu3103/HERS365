// @ts-nocheck
import { Router } from 'express';
import { db } from './db';
import * as schema from './schema';
import { eq, desc, and, sql, like, or } from 'drizzle-orm';
import { calculateRankingScore, getRankingTier, getTierColor } from './rankingAlgorithm';

const router = Router();

// Get rankings with filters (state, national, position, graduation year)
router.get('/players', async (req, res) => {
  try {
    const { 
      level = 'national', // 'national', 'state', 'local'
      state,
      position,
      graduationYear,
      limit = 100,
      offset = 0
    } = req.query;

    let query = db.select({
      id: schema.players.id,
      name: schema.players.name,
      position: schema.players.position,
      state: schema.players.state,
      graduationYear: schema.players.graduationYear,
      school: schema.players.school,
      profileImage: schema.players.profileImage,
      g5Rating: schema.players.g5Rating,
      archetype: schema.players.archetype,
      // Rankings
      nationalRank: schema.athleteRankings.nationalRank,
      stateRank: schema.athleteRankings.stateRank,
      positionRank: schema.athleteRankings.positionRank,
      movement: schema.athleteRankings.movement,
      // Scores
      combineScore: schema.athleteRankings.combineScore,
      maxPrepsScore: schema.athleteRankings.maxPrepsScore,
      zybekScore: schema.athleteRankings.zybekScore,
      overallScore: schema.athleteRankings.overallScore,
      // Data sources
      dataSources: schema.athleteRankings.dataSources,
      lastUpdated: schema.athleteRankings.updatedAt,
    })
    .from(schema.players)
    .leftJoin(schema.athleteRankings, eq(schema.players.id, schema.athleteRankings.playerId));

    // Apply filters
    const filters = [];
    
    if (state && level !== 'national') {
      filters.push(eq(schema.players.state, state as string));
    }
    
    if (position) {
      filters.push(eq(schema.players.position, position as string));
    }
    
    if (graduationYear) {
      filters.push(eq(schema.players.graduationYear, parseInt(graduationYear as string)));
    }
    
    if (filters.length > 0) {
      query = query.where(and(...filters)) as any;
    }

    // Order by appropriate ranking
    if (level === 'state' && state) {
      query = query.orderBy(schema.athleteRankings.stateRank) as any;
    } else if (level === 'local') {
      query = query.orderBy(schema.athleteRankings.positionRank) as any;
    } else {
      query = query.orderBy(schema.athleteRankings.nationalRank) as any;
    }

    query = query.limit(parseInt(limit as string)).offset(parseInt(offset as string));
    
    const rankings = await query;

    // Enrich with tier information
    const enrichedRankings = rankings.map(player => {
      const score = player.overallScore || 0;
      return {
        ...player,
        tier: getRankingTier(score),
        tierColor: getTierColor(getRankingTier(score)),
      };
    });

    res.json(enrichedRankings);
  } catch (error) {
    console.error('Error fetching player rankings:', error);
    res.status(500).json({ message: 'Error fetching player rankings' });
  }
});

// Get single player ranking details with all data sources
router.get('/players/:id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    
    const player = await db.select()
      .from(schema.players)
      .where(eq(schema.players.id, playerId));

    if (!player[0]) {
      return res.status(404).json({ message: 'Player not found' });
    }

    const rankings = await db.select()
      .from(schema.athleteRankings)
      .where(eq(schema.athleteRankings.playerId, playerId));

    const ranking = rankings[0] || {};
    const score = ranking.overallScore || 0;

    res.json({
      ...player[0],
      rankings: {
        nationalRank: ranking.nationalRank,
        stateRank: ranking.stateRank,
        positionRank: ranking.positionRank,
        movement: ranking.movement,
      },
      scores: {
        overall: score,
        combine: ranking.combineScore || 0,
        maxPreps: ranking.maxPrepsScore || 0,
        zybek: ranking.zybekScore || 0,
        usaTalentId: ranking.usaTalentIdScore || 0,
      },
      tier: getRankingTier(score),
      tierColor: getTierColor(getRankingTier(score)),
      dataSources: ranking.dataSources || [],
      lastUpdated: ranking.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching player ranking details:', error);
    res.status(500).json({ message: 'Error fetching player ranking details' });
  }
});

// Get available states for rankings
router.get('/states', async (req, res) => {
  try {
    const states = await db.selectDistinct({
      state: schema.players.state,
    })
    .from(schema.players)
    .where(sql`${schema.players.state} IS NOT NULL`);

    const stateList = states.map(s => s.state).filter(Boolean).sort();
    res.json(stateList);
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ message: 'Error fetching states' });
  }
});

// Get available positions
router.get('/positions', async (req, res) => {
  try {
    const positions = await db.selectDistinct({
      position: schema.players.position,
    })
    .from(schema.players)
    .where(sql`${schema.players.position} IS NOT NULL`);

    const positionList = positions.map(p => p.position).filter(Boolean).sort();
    res.json(positionList);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ message: 'Error fetching positions' });
  }
});

// Get ranking criteria explanation
router.get('/criteria', async (req, res) => {
  try {
    res.json({
      description: 'H.E.R.S.365 rankings are calculated using a weighted algorithm that integrates multiple verified data sources.',
      sources: [
        {
          name: 'Combine Events',
          weight: '30%',
          metrics: ['40-yard dash', '3-cone drill', 'Shuttle run', 'Vertical jump', 'Broad jump', 'Route running', 'Catching', 'Throwing'],
          verified: true,
        },
        {
          name: 'MaxPreps',
          weight: '25%',
          metrics: ['Tackles', 'Sacks', 'Interceptions', 'Touchdowns', 'Passing/Rushing/Receiving yards'],
          verified: true,
        },
        {
          name: 'Zybek Sports',
          weight: '25%',
          metrics: ['40-yard dash', 'Shuttle', '3-cone', 'Vertical', 'Broad jump', 'Power throw', 'Accuracy'],
          verified: true,
        },
        {
          name: 'USA Talent ID',
          weight: '20%',
          metrics: ['Overall rating', 'Speed', 'Agility', 'Strength', 'Technique'],
          verified: true,
        },
      ],
      tiers: [
        { name: 'Elite', score: '90+', color: '#FFD700' },
        { name: 'High Major', score: '75-89', color: '#C0C0C0' },
        { name: 'Major', score: '60-74', color: '#CD7F32' },
        { name: 'Division I', score: '45-59', color: '#14B8A6' },
        { name: 'Division II', score: '30-44', color: '#3B82F6' },
        { name: 'Division III', score: '15-29', color: '#8B5CF6' },
        { name: 'Developing', score: '0-14', color: '#6B7280' },
      ],
      methodology: 'Scores are normalized to a 0-100 scale. Higher scores indicate better athletic performance. Rankings are updated weekly based on new data from verified sources.',
    });
  } catch (error) {
    console.error('Error fetching ranking criteria:', error);
    res.status(500).json({ message: 'Error fetching ranking criteria' });
  }
});

// Update player ranking (admin function)
router.post('/calculate/:playerId', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    
    // Fetch all athlete data from various sources
    // This would integrate with actual data sources in production
    const mockAthleteData = {
      id: playerId,
      name: '',
      state: '',
      highSchool: '',
      graduationYear: 2026,
      position: 'WR',
    };
    
    // Calculate ranking scores
    const scores = calculateRankingScore(mockAthleteData);
    
    // Update database
    await db.insert(schema.athleteRankings)
      .values({
        playerId,
        overallScore: scores.overallScore,
        combineScore: scores.combineScore,
        maxPrepsScore: scores.maxPrepsScore,
        zybekScore: scores.zybekScore,
        usaTalentIdScore: scores.usaTalentIdScore,
        dataSources: scores.dataSources,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.athleteRankings.playerId,
        set: {
          overallScore: scores.overallScore,
          combineScore: scores.combineScore,
          maxPrepsScore: scores.maxPrepsScore,
          zybekScore: scores.zybekScore,
          usaTalentIdScore: scores.usaTalentIdScore,
          dataSources: scores.dataSources,
          updatedAt: new Date(),
        },
      });

    res.json({
      success: true,
      playerId,
      scores,
    });
  } catch (error) {
    console.error('Error calculating ranking:', error);
    res.status(500).json({ message: 'Error calculating ranking' });
  }
});

// Get team rankings
router.get('/teams', async (req, res) => {
  const { type = 'high_school' } = req.query;
  try {
    let query = db.select().from(schema.teams);
    if (type) {
      query = query.where(eq(schema.teams.type, type as string));
    }
    const teams = await query.orderBy(desc(schema.teams.rating));
    res.json(teams);
  } catch (error) {
    console.error('Error fetching team rankings:', error);
    res.status(500).json({ message: 'Error fetching team rankings' });
  }
});

export default router;