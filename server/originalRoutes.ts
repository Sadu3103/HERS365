import { Router } from 'express';
import { ncaaDivision1FlagFootballTeams, flagFootballTrainingVideos, athletes, recruiters } from './originalData';

const router = Router();

// Flag Football Teams Endpoints (Migrated)
router.get('/teams', (req, res) => {
    res.json({ 
        success: true, 
        data: ncaaDivision1FlagFootballTeams,
        count: ncaaDivision1FlagFootballTeams.length
    });
});

router.get('/teams/:type', (req, res) => {
    const { type } = req.params;
    const filteredTeams = ncaaDivision1FlagFootballTeams.filter(
        team => team.type.toLowerCase() === type.toLowerCase()
    );
    res.json({ 
        success: true, 
        data: filteredTeams,
        count: filteredTeams.length
    });
});

router.get('/training-videos', (req, res) => {
    res.json({ 
        success: true, 
        data: flagFootballTrainingVideos
    });
});

// Recruiting Endpoints (Migrated)
router.get('/recruiting/athletes', (req, res) => {
    res.json({ success: true, data: athletes });
});

router.get('/recruiting/recruiters', (req, res) => {
    res.json({ success: true, data: recruiters });
});

router.post('/recruiting/profile', (req, res) => {
    res.json({ success: true, message: 'Profile saved successfully' });
});

router.post('/recruiting/connect', (req, res) => {
    res.json({ success: true, message: 'Connection request sent' });
});

// NFL Scouting / Draft Tracking (Migrated)
router.post('/scout-player', (req, res) => {
    const { playerName, action } = req.body;
    res.json({ 
        success: true,
        message: `Player ${playerName} added to scout list`,
        scoutingReport: {
            playerName,
            action,
            scoutRating: 5,
            draftGrade: 'A+',
            timestamp: new Date().toISOString()
        }
    });
});

router.post('/track-draft', (req, res) => {
    const { playerName, action } = req.body;
    res.json({ 
        success: true,
        message: `Now tracking ${playerName} for draft updates`,
        draftTracking: {
            playerName,
            action,
            mockDraftPosition: 1,
            stockTrend: 'Rising',
            lastUpdated: new Date().toISOString()
        }
    });
});

export default router;
