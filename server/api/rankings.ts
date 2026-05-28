import express from 'express';

const router = express.Router();

// Mock data for rankings
const mockRankings = [
  {
    id: 1,
    name: 'Sarah Johnson',
    school: 'Lincoln High',
    position: 'QB',
    rating: 98.5,
    change: 2.1,
    stats: { speed: 95, strength: 88, agility: 92, technique: 97 },
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  },
  {
    id: 2,
    name: 'Emma Davis',
    school: 'Washington Prep',
    position: 'WR',
    rating: 97.8,
    change: -0.5,
    stats: { speed: 98, strength: 85, agility: 96, technique: 94 },
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'
  },
  {
    id: 3,
    name: 'Olivia Brown',
    school: 'Jefferson Academy',
    position: 'RB',
    rating: 97.2,
    change: 1.8,
    stats: { speed: 97, strength: 90, agility: 95, technique: 92 },
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia'
  }
];

// GET /api/rankings - Get all player rankings
router.get('/', (req, res) => {
  try {
    const { position, school, sortBy = 'rating', limit = 50 } = req.query;

    let filteredRankings = [...mockRankings];

    // Apply filters
    if (position && position !== 'All') {
      filteredRankings = filteredRankings.filter(r => r.position === position);
    }

    if (school && school !== 'All') {
      filteredRankings = filteredRankings.filter(r => r.school === school);
    }

    // Apply sorting
    filteredRankings.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    // Apply limit
    filteredRankings = filteredRankings.slice(0, Number(limit));

    res.json({
      success: true,
      data: filteredRankings,
      total: mockRankings.length,
      filtered: filteredRankings.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rankings'
    });
  }
});

// GET /api/rankings/:id - Get specific player ranking
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const ranking = mockRankings.find(r => r.id === parseInt(id));

    if (!ranking) {
      return res.status(404).json({
        success: false,
        error: 'Player not found'
      });
    }

    res.json({
      success: true,
      data: ranking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player ranking'
    });
  }
});

// GET /api/rankings/stats/overview - Get rankings overview stats
router.get('/stats/overview', (req, res) => {
  try {
    const overview = {
      totalPlayers: mockRankings.length,
      averageRating: mockRankings.reduce((sum, r) => sum + r.rating, 0) / mockRankings.length,
      topPosition: 'QB',
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview stats'
    });
  }
});

export { router as rankingsRouter };