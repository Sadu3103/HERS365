import express from 'express';

const router = express.Router();

// Mock user data
const mockUser = {
  id: 1,
  name: 'Sarah Johnson',
  email: 'sarah.johnson@email.com',
  school: 'Lincoln High School',
  position: 'Quarterback',
  graduationYear: 2026,
  location: 'Los Angeles, CA',
  bio: 'Passionate quarterback with a love for the game and academics. Leading my team to victory while maintaining straight A\'s. Future college athlete with big dreams!',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  coverImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200',
  stats: {
    rating: 98.5,
    speed: 95,
    strength: 88,
    agility: 92,
    technique: 97,
    verticalJump: '28"',
    benchPress: '185 lbs',
    fortyYardDash: '4.8s',
    threeConeDrill: '7.2s',
    shuttleRun: '4.4s'
  },
  achievements: [
    'State Champion 2024',
    'Team Captain',
    'Academic All-Star',
    'Leadership Award',
    'Perfect Attendance 2023-2024'
  ],
  social: {
    followers: 1247,
    following: 89,
    posts: 56
  },
  isVerified: true,
  joinDate: '2023-01-15',
  lastActive: new Date().toISOString(),
  preferences: {
    notifications: {
      email: true,
      push: true,
      scoutMessages: true,
      teamUpdates: false,
      marketing: false
    },
    privacy: {
      profileVisibility: 'public',
      contactInfo: 'verified_users',
      statsVisibility: 'everyone',
      activityStatus: 'friends'
    },
    appearance: {
      theme: 'dark',
      language: 'en-US',
      timezone: 'America/Los_Angeles'
    }
  }
};

// GET /api/users/profile - Get current user profile
router.get('/profile', (req, res) => {
  try {
    res.json({
      success: true,
      data: mockUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', (req, res) => {
  try {
    const updates = req.body;

    // In a real app, validate and update the user data
    Object.assign(mockUser, updates);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: mockUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// PUT /api/users/preferences - Update user preferences
router.put('/preferences', (req, res) => {
  try {
    const { category, preferences } = req.body;

    if (!category || !preferences) {
      return res.status(400).json({
        success: false,
        error: 'Category and preferences are required'
      });
    }

    if (!mockUser.preferences[category as keyof typeof mockUser.preferences]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid preference category'
      });
    }

    Object.assign(mockUser.preferences[category as keyof typeof mockUser.preferences], preferences);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: mockUser.preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

// GET /api/users/stats - Get user statistics
router.get('/stats', (req, res) => {
  try {
    res.json({
      success: true,
      data: mockUser.stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stats'
    });
  }
});

// GET /api/users/achievements - Get user achievements
router.get('/achievements', (req, res) => {
  try {
    res.json({
      success: true,
      data: mockUser.achievements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements'
    });
  }
});

// GET /api/users/activity - Get user activity feed
router.get('/activity', (req, res) => {
  try {
    const activities = [
      {
        id: 1,
        type: 'achievement',
        title: 'New Personal Record',
        description: '40-yard dash: 4.8 seconds - new PR!',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 2,
        type: 'post',
        title: 'Game Day Motivation',
        description: 'Posted a new highlight reel from Friday\'s game',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        type: 'workout',
        title: 'Training Session Complete',
        description: 'Completed QB fundamentals training - 2 hours',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 4,
        type: 'achievement',
        title: 'Team Victory',
        description: 'Led team to 45-12 victory over rivals',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity'
    });
  }
});

// POST /api/users/follow/:userId - Follow/unfollow a user
router.post('/follow/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // 'follow' or 'unfollow'

    // Mock follow/unfollow logic
    if (action === 'follow') {
      mockUser.social.following += 1;
    } else if (action === 'unfollow') {
      mockUser.social.following = Math.max(0, mockUser.social.following - 1);
    }

    res.json({
      success: true,
      message: `User ${action}ed successfully`,
      data: {
        following: mockUser.social.following
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to follow/unfollow user'
    });
  }
});

// GET /api/users/search - Search for users
router.get('/search', (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Mock search results
    const searchResults = [
      {
        id: 2,
        name: 'Emma Davis',
        school: 'Washington Prep',
        position: 'WR',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
        isFollowing: false
      },
      {
        id: 3,
        name: 'Coach Anderson',
        school: 'Lincoln High',
        position: 'Coach',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Coach',
        isFollowing: true
      }
    ].filter(user =>
      user.name.toLowerCase().includes(query.toString().toLowerCase()) ||
      user.school.toLowerCase().includes(query.toString().toLowerCase())
    ).slice(0, Number(limit));

    res.json({
      success: true,
      data: searchResults
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

// POST /api/users/avatar - Upload/update avatar
router.post('/avatar', (req, res) => {
  try {
    // In a real app, handle file upload
    const { avatarUrl } = req.body;

    if (avatarUrl) {
      mockUser.avatar = avatarUrl;
    }

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: { avatar: mockUser.avatar }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update avatar'
    });
  }
});

// DELETE /api/users/account - Delete user account
router.delete('/account', (req, res) => {
  try {
    // In a real app, implement account deletion logic
    // This would typically require confirmation and handle data cleanup

    res.json({
      success: true,
      message: 'Account deletion initiated. You will receive a confirmation email.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    });
  }
});

// GET /api/users/export - Export user data
router.get('/export', (req, res) => {
  try {
    // In a real app, generate and return user data export
    res.json({
      success: true,
      message: 'Data export ready',
      data: {
        user: mockUser,
        exportUrl: '/api/users/export/download'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

export { router as usersRouter };