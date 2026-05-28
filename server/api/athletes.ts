import express from 'express';

const router = express.Router();

// Mock data for athletes
const mockAthletes = [
  {
    id: 1,
    name: 'Sarah Johnson',
    school: 'Lincoln High School',
    position: 'QB',
    rating: 98.5,
    location: 'California',
    graduationYear: 2026,
    height: '5\'8"',
    weight: 145,
    stats: { speed: 95, strength: 88, agility: 92, technique: 97 },
    achievements: ['State Champion', 'Team Captain', 'Academic All-Star'],
    isFavorited: false,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    lastActive: '2 hours ago',
    bio: 'Passionate quarterback with a love for the game and academics.',
    followers: 1247,
    following: 89,
    posts: 56
  },
  {
    id: 2,
    name: 'Emma Davis',
    school: 'Washington Prep',
    position: 'WR',
    rating: 97.8,
    location: 'Texas',
    graduationYear: 2026,
    height: '5\'6"',
    weight: 130,
    stats: { speed: 98, strength: 85, agility: 96, technique: 94 },
    achievements: ['All-Conference', 'Speed Champion', 'Scholar Athlete'],
    isFavorited: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    lastActive: '1 day ago',
    bio: 'Dynamic wide receiver with exceptional speed and hands.',
    followers: 892,
    following: 156,
    posts: 43
  }
];

// GET /api/athletes - Search and filter athletes
router.get('/', (req, res) => {
  try {
    const {
      search,
      position,
      location,
      graduationYear,
      rating,
      sortBy = 'rating',
      limit = 20,
      offset = 0
    } = req.query;

    let filteredAthletes = [...mockAthletes];

    // Apply search filter
    if (search) {
      const searchLower = search.toString().toLowerCase();
      filteredAthletes = filteredAthletes.filter(athlete =>
        athlete.name.toLowerCase().includes(searchLower) ||
        athlete.school.toLowerCase().includes(searchLower) ||
        athlete.position.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    if (position && position !== 'All') {
      filteredAthletes = filteredAthletes.filter(a => a.position === position);
    }

    if (location && location !== 'All') {
      filteredAthletes = filteredAthletes.filter(a => a.location === location);
    }

    if (graduationYear && graduationYear !== 'All') {
      filteredAthletes = filteredAthletes.filter(a => a.graduationYear === parseInt(graduationYear.toString()));
    }

    if (rating && rating !== 'All') {
      let minRating = 0;
      switch (rating) {
        case '95+': minRating = 95; break;
        case '90-94': minRating = 90; break;
        case '85-89': minRating = 85; break;
        case '80-84': minRating = 80; break;
      }
      filteredAthletes = filteredAthletes.filter(a => a.rating >= minRating);
    }

    // Apply sorting
    filteredAthletes.sort((a, b) => {
      switch (sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'name': return a.name.localeCompare(b.name);
        case 'school': return a.school.localeCompare(b.school);
        default: return 0;
      }
    });

    // Apply pagination
    const total = filteredAthletes.length;
    filteredAthletes = filteredAthletes.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: filteredAthletes,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch athletes'
    });
  }
});

// GET /api/athletes/:id - Get specific athlete profile
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const athlete = mockAthletes.find(a => a.id === parseInt(id));

    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found'
      });
    }

    res.json({
      success: true,
      data: athlete
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch athlete profile'
    });
  }
});

// POST /api/athletes/:id/favorite - Toggle favorite status
router.post('/:id/favorite', (req, res) => {
  try {
    const { id } = req.params;
    const athlete = mockAthletes.find(a => a.id === parseInt(id));

    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found'
      });
    }

    athlete.isFavorited = !athlete.isFavorited;

    res.json({
      success: true,
      data: {
        id: athlete.id,
        isFavorited: athlete.isFavorited
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite'
    });
  }
});

// GET /api/athletes/:id/stats - Get detailed athlete stats
router.get('/:id/stats', (req, res) => {
  try {
    const { id } = req.params;
    const athlete = mockAthletes.find(a => a.id === parseInt(id));

    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found'
      });
    }

    const detailedStats = {
      ...athlete.stats,
      // Add more detailed stats
      verticalJump: '28"',
      benchPress: '185 lbs',
      fortyYardDash: '4.8s',
      threeConeDrill: '7.2s',
      shuttleRun: '4.4s'
    };

    res.json({
      success: true,
      data: detailedStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch athlete stats'
    });
  }
});

export { router as athletesRouter };