import express from 'express';
import { asc, desc, eq, and, isNotNull } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { clampIntQuery } from '../lib/queryParam';
import { parseIdParam } from '../lib/parseIdParam';

const router = express.Router();

// Mirrors the list-endpoint convention: unset prefs are visible, only an
// explicit `rankingVisible:false` hides. Malformed JSON fails closed so a
// corrupt row can never silently leak a minor who opted out.
function isRankingVisible(preferences: unknown): boolean {
  try {
    const prefs = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;
    if (prefs == null) return true;
    return (prefs as Record<string, unknown>).rankingVisible !== false;
  } catch {
    return false;
  }
}

router.get('/', async (req, res) => {
  try {
    const { position, search } = req.query;
    const page = clampIntQuery(req.query.page, { default: 1, min: 1, max: 10000 });
    const limitNum = clampIntQuery(req.query.limit, { default: 25, min: 1, max: 100 });

    const rowsRaw = await db
      .select({
        id: schema.players.id,
        name: schema.players.name,
        school: schema.players.school,
        position: schema.players.position,
        gpa: schema.players.gpa,
        gradYear: schema.players.gradYear,
        g5Rating: schema.players.g5Rating,
        xpPoints: schema.players.xpPoints,
        verificationStatus: schema.players.verificationStatus,
        preferences: schema.players.preferences,
      })
      .from(schema.players)
      // Only rated athletes appear on the board. This also keeps unrated test
      // accounts out, and avoids Postgres sorting NULL g5Rating first under DESC.
      .where(and(eq(schema.players.privacySetting, 'public'), isNotNull(schema.players.g5Rating)))
      // Tiebreak order: rating, then activity (XP), then name. The final name
      // sort makes ties deterministic so the board does not reshuffle equal
      // scores between refreshes (which reads as arbitrary to athletes).
      .orderBy(desc(schema.players.g5Rating), desc(schema.players.xpPoints), asc(schema.players.name))
      // Pull the whole rated board (capped) rather than one page: a row's rank is
      // its global board position and rankingVisible lives in a JSON pref, so both
      // have to be computed over the full ordered set before we can search, filter
      // by position, and slice out the requested page.
      .limit(2000);

    // Parent-controlled ranking visibility: drop athletes whose parent has
    // flipped rankingVisibility=false (mirrors the coach-search filter in
    // server/coachRoutes.ts). Unset or true stays in results. Filter before
    // rank assignment so ranks stay consecutive 1..N over visible athletes.
    const rows = rowsRaw.filter((p) => {
      const prefs = (p.preferences ?? {}) as Record<string, unknown>;
      return prefs.rankingVisible !== false;
    });

    // Assign each athlete their global board rank before any search/position
    // filter, so a filtered or searched row still shows its true rank (e.g. #47),
    // not its position within the filtered subset.
    let ranked = rows.map((p, i) => ({
      id: p.id,
      rank: i + 1,
      name: p.name,
      school: p.school ?? '',
      position: p.position ?? '–',
      gpa: p.gpa ?? null,
      gradYear: p.gradYear ?? null,
      rating: Math.min(99, (p.g5Rating ?? 0) * 18 + Math.round((p.xpPoints ?? 0) / 100)),
      change: 0,
      verified: p.verificationStatus === 'verified',
    }));

    if (position && position !== 'All') {
      ranked = ranked.filter(r => r.position === position);
    }

    const q = typeof search === 'string' ? search.trim().toLowerCase() : '';
    if (q) {
      ranked = ranked.filter(r =>
        r.name.toLowerCase().includes(q) || r.school.toLowerCase().includes(q));
    }

    const total = ranked.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const offset = (page - 1) * limitNum;
    const data = ranked.slice(offset, offset + limitNum);

    res.json({ success: true, data, total, totalPages, page });
  } catch (error) {
    console.error('[rankings]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rankings' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });

    const [p] = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, id))
      .limit(1);

    if (!p) return res.status(404).json({ success: false, error: 'Player not found' });
    // Hidden players must be indistinguishable from nonexistent ids: returning
    // 403 here would let an unauthenticated scraper enumerate minors who opted
    // out of the public board. 404 leaks nothing.
    if (!isRankingVisible(p.preferences)) return res.status(404).json({ success: false, error: 'Player not found' });

    res.json({
      success: true,
      data: {
        id: p.id,
        name: p.name,
        school: p.school,
        position: p.position,
        gpa: p.gpa,
        gradYear: p.gradYear,
        rating: Math.min(99, (p.g5Rating ?? 0) * 18 + Math.round((p.xpPoints ?? 0) / 100)),
        verified: p.verificationStatus === 'verified',
      },
    });
  } catch (error) {
    console.error('[rankings/:id]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch player ranking' });
  }
});

export { router as rankingsRouter };
export const __test__ = { isRankingVisible };
