import express from 'express';

const router = express.Router();

const mockCoaches: Record<number, any> = {
  1: {
    id: 1,
    name: 'Coach Maria Torres',
    title: 'Head Coach',
    school: 'University of Texas',
    sport: 'Flag Football',
    email: 'mtorres@utexas.edu',
    bio: 'Coach Torres brings 12 years of collegiate flag football experience. Former All-American QB who led her team to 3 national championships. Focused on developing elite QBs and DBs.',
    recruitedAthletes: ['Sarah W. (QB, TX)', 'Amara J. (DB, GA)', 'Priya K. (WR, CA)'],
  },
  2: {
    id: 2,
    name: 'Coach Lisa Monroe',
    title: 'Head Coach',
    school: 'Florida State University',
    sport: 'Flag Football',
    email: 'lmonroe@fsu.edu',
    bio: 'A decorated coach with 8 years at FSU. Known for building elite offensive systems. 2x conference champion and national finalist.',
    recruitedAthletes: ['Destiny R. (WR, FL)', 'Chloe B. (QB, TX)'],
  },
  3: {
    id: 3,
    name: 'Coach Angela Reed',
    title: 'Head Coach',
    school: 'Azusa Pacific University',
    sport: 'Flag Football',
    email: 'areed@apu.edu',
    bio: 'Coach Reed has developed 6 All-NAIA selections in her 5-year tenure. Passionate about the student-athlete balance and faith-based leadership.',
    recruitedAthletes: ['Hannah L. (RB, CA)', 'Jada T. (LB, AZ)'],
  },
  4: {
    id: 4,
    name: 'Coach Sandra Hill',
    title: 'Head Coach',
    school: 'Hardin-Simmons University',
    sport: 'Flag Football',
    email: 'shill@hsutx.edu',
    bio: 'Building the program from the ground up since 2021. Great opportunity for athletes who want immediate playing time in a growing D3 program.',
    recruitedAthletes: ['Emily G. (QB, TX)'],
  },
  5: {
    id: 5,
    name: 'Coach Tiffany Brooks',
    title: 'Head Coach',
    school: 'Shorter University',
    sport: 'Flag Football',
    email: 'tbrooks@shorter.edu',
    bio: 'Southeast regional powerhouse. Coach Brooks has 10 years of flag football coaching at multiple levels. Known for developing defensive specialists.',
    recruitedAthletes: ['Nia C. (DB, GA)', 'Morgan S. (LB, TN)', 'Ava H. (WR, AL)'],
  },
  6: {
    id: 6,
    name: 'Coach Denise Carr',
    title: 'Head Coach',
    school: 'Lindenwood University',
    sport: 'Flag Football',
    email: 'dcarr@lindenwood.edu',
    bio: 'Veteran coach with 15 years of experience. Led Lindenwood to their first OVC championship in 2024. Recruiting elite athletes across all positions.',
    recruitedAthletes: ['Taylor M. (QB, MO)', 'Jasmine P. (WR, IL)', 'Kayla R. (DB, KS)'],
  },
  7: {
    id: 7,
    name: 'Coach Patricia Vega',
    title: 'Head Coach',
    school: 'Benedictine College',
    sport: 'Flag Football',
    email: 'pvega@benedictine.edu',
    bio: 'Strong academic focus with competitive athletics. Coach Vega has built Benedictine into one of the premier small-school programs in the Midwest.',
    recruitedAthletes: ['Lauren K. (RB, KS)'],
  },
};

// GET /api/coaches/:id
router.get('/:id', (req, res) => {
  try {
    const coach = mockCoaches[parseInt(req.params.id)];
    if (!coach) {
      return res.status(404).json({ success: false, error: 'Coach not found' });
    }
    res.json({ success: true, data: coach });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch coach profile' });
  }
});

export { router as coachesRouter };
