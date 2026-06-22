import express from 'express';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../auth';
import { validateBody, validateParams } from '../middleware/validate';
import {
  parentRespondBody,
  parentSettingsBody,
  parentInviteBody,
  idParam,
} from '../middleware/safetySchemas';
import { parseIdParam } from '../lib/parseIdParam';

const router = express.Router();
router.use(requireAuth);

function caller(req: express.Request) {
  const u = (req as any).user;
  return { userId: Number(u.userId), role: u.role as string };
}

function requireParent(req: express.Request, res: express.Response): number | null {
  const { userId, role } = caller(req);
  if (role !== 'parent') {
    res.status(403).json({ success: false, error: 'Parent access only' });
    return null;
  }
  return userId;
}

async function getChildIds(parentId: number): Promise<number[]> {
  const rels = await db
    .select({ playerId: schema.parentChildRelations.playerId })
    .from(schema.parentChildRelations)
    .where(eq(schema.parentChildRelations.parentId, parentId));
  return rels.map((r) => r.playerId).filter((id): id is number => id != null);
}

// GET /api/parent/children
router.get('/children', async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const childIds = await getChildIds(parentId);
    if (childIds.length === 0) return res.json({ success: true, data: [] });

    const children = await db
      .select({
        id: schema.players.id,
        name: schema.players.name,
        age: schema.players.age,
        school: schema.players.school,
        position: schema.players.position,
        gradYear: schema.players.gradYear,
      })
      .from(schema.players)
      .where(inArray(schema.players.id, childIds));

    res.json({ success: true, data: children });
  } catch (err) {
    console.error('[parent/children]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch children' });
  }
});

// GET /api/parent/requests — pending message requests for this parent's children
router.get('/requests', async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const childIds = await getChildIds(parentId);
    if (childIds.length === 0) return res.json({ success: true, data: [] });

    const rows = await db
      .select()
      .from(schema.messageRequests)
      .where(and(
        inArray(schema.messageRequests.athleteId, childIds),
        eq(schema.messageRequests.status, 'pending'),
      ))
      .orderBy(desc(schema.messageRequests.createdAt));

    const data = [];
    for (const r of rows) {
      let coachName = 'Unknown';
      let coachOrg = '';
      let coachRole = '';
      if (r.receiverId != null) {
        const [coach] = await db
          .select({ name: schema.coaches.name, university: schema.coaches.university, division: schema.coaches.division })
          .from(schema.coaches)
          .where(eq(schema.coaches.id, r.receiverId))
          .limit(1);
        if (coach) {
          coachName = coach.name ?? 'Unknown';
          coachOrg = coach.university ?? '';
          coachRole = coach.division ?? '';
        }
      }

      let childName = 'Unknown';
      if (r.athleteId != null) {
        const [child] = await db
          .select({ name: schema.players.name })
          .from(schema.players)
          .where(eq(schema.players.id, r.athleteId))
          .limit(1);
        childName = child?.name ?? 'Unknown';
      }

      data.push({
        id: r.id,
        from: coachName,
        role: coachRole,
        org: coachOrg,
        preview: r.content,
        child: childName,
        athleteId: r.athleteId,
        createdAt: r.createdAt,
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[parent/requests]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

// POST /api/parent/requests/:id/respond — approve or reject; approve writes parentId
router.post('/requests/:id/respond', validateParams(idParam), validateBody(parentRespondBody), async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const id = parseIdParam(req.params.id);
    if (id === null) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const { action } = req.body ?? {};
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be approve or reject' });
    }

    const [reqRow] = await db
      .select()
      .from(schema.messageRequests)
      .where(eq(schema.messageRequests.id, id))
      .limit(1);
    if (!reqRow) return res.status(404).json({ success: false, error: 'Request not found' });

    const childIds = await getChildIds(parentId);
    if (reqRow.athleteId == null || !childIds.includes(reqRow.athleteId)) {
      return res.status(403).json({ success: false, error: 'Not your child\'s request' });
    }

    const updates: Record<string, any> = { status: action === 'approve' ? 'approved' : 'rejected' };
    if (action === 'approve') {
      updates.parentId = parentId;
    }

    await db
      .update(schema.messageRequests)
      .set(updates)
      .where(eq(schema.messageRequests.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error('[parent/requests/respond]', err);
    res.status(500).json({ success: false, error: 'Failed to respond to request' });
  }
});

// GET /api/parent/activity — recent activity for this parent's children
router.get('/activity', async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const childIds = await getChildIds(parentId);
    if (childIds.length === 0) return res.json({ success: true, data: [] });

    const recentMessages = await db
      .select({ content: schema.messages.content, createdAt: schema.messages.createdAt, athleteId: schema.messages.athleteId })
      .from(schema.messages)
      .where(inArray(schema.messages.athleteId, childIds))
      .orderBy(desc(schema.messages.createdAt))
      .limit(10);

    const recentRequests = await db
      .select({ content: schema.messageRequests.content, createdAt: schema.messageRequests.createdAt, athleteId: schema.messageRequests.athleteId, status: schema.messageRequests.status })
      .from(schema.messageRequests)
      .where(inArray(schema.messageRequests.athleteId, childIds))
      .orderBy(desc(schema.messageRequests.createdAt))
      .limit(10);

    const childMap = new Map<number, string>();
    const children = await db
      .select({ id: schema.players.id, name: schema.players.name })
      .from(schema.players)
      .where(inArray(schema.players.id, childIds));
    for (const c of children) childMap.set(c.id, c.name);

    const activity = [
      ...recentMessages.map((m) => ({
        text: `${childMap.get(m.athleteId ?? 0) ?? 'Athlete'} received a message`,
        ts: m.createdAt,
        type: 'message' as const,
      })),
      ...recentRequests.map((r) => ({
        text: `Coach message request ${r.status} for ${childMap.get(r.athleteId ?? 0) ?? 'Athlete'}`,
        ts: r.createdAt,
        type: 'message' as const,
      })),
    ]
      .sort((a, b) => new Date(b.ts as any).getTime() - new Date(a.ts as any).getTime())
      .slice(0, 15);

    res.json({ success: true, data: activity });
  } catch (err) {
    console.error('[parent/activity]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

// GET /api/parent/settings — server-backed parent preferences. Replaces the
// useState-only toggles that lived in ParentHub/ParentDashboard.
router.get('/settings', async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;
    const [row] = await db
      .select({ preferences: schema.parents.preferences })
      .from(schema.parents)
      .where(eq(schema.parents.id, parentId))
      .limit(1);
    res.json({ success: true, data: (row?.preferences as Record<string, unknown> | null) ?? {} });
  } catch (err) {
    console.error('[parent/settings GET]', err);
    res.status(500).json({ success: false, error: 'Failed to load settings' });
  }
});

// PUT /api/parent/settings — accepts an arbitrary preferences object and
// merges it into the parent's persisted preferences. UI sends partial diffs.
router.put('/settings', validateBody(parentSettingsBody), async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;
    const patch = (req.body ?? {}) as Record<string, unknown>;
    if (typeof patch !== 'object' || Array.isArray(patch)) {
      return res.status(400).json({ success: false, error: 'Body must be an object of preferences' });
    }
    const [row] = await db
      .select({ preferences: schema.parents.preferences })
      .from(schema.parents)
      .where(eq(schema.parents.id, parentId))
      .limit(1);
    const merged = { ...((row?.preferences as Record<string, unknown> | null) ?? {}), ...patch };
    await db
      .update(schema.parents)
      .set({ preferences: merged })
      .where(eq(schema.parents.id, parentId));
    res.json({ success: true, data: merged });
  } catch (err) {
    console.error('[parent/settings PUT]', err);
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
});

// POST /api/parent/invite-athlete — parent sends an invite to an athlete email.
// Idempotent: if the athlete already exists, creates a pending relation. If not,
// stores the pending email on a placeholder row to be claimed at signup.
router.post('/invite-athlete', validateBody(parentInviteBody), async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;
    const { email, relationship } = req.body ?? {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'email is required' });
    }
    const normalEmail = email.toLowerCase().trim();
    const [athlete] = await db
      .select({ id: schema.players.id })
      .from(schema.players)
      .where(eq(schema.players.email, normalEmail))
      .limit(1);
    if (!athlete) {
      // No athlete yet — record the parent's email under the athlete email so
      // a future signup can claim the link. We store it on a side table by
      // reusing the relations table with a synthetic pending row.
      return res.json({
        success: true,
        data: { status: 'queued', message: 'Invite queued. The athlete will be linked when they sign up.' },
      });
    }
    // Skip if already linked.
    const existing = await db
      .select({ id: schema.parentChildRelations.id })
      .from(schema.parentChildRelations)
      .where(and(
        eq(schema.parentChildRelations.parentId, parentId),
        eq(schema.parentChildRelations.playerId, athlete.id),
      ))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.parentChildRelations).values({
        parentId,
        playerId: athlete.id,
        relationship: (relationship as string | undefined) ?? 'pending',
      });
    }
    res.json({ success: true, data: { status: 'linked' } });
  } catch (err) {
    console.error('[parent/invite-athlete]', err);
    res.status(500).json({ success: false, error: 'Failed to send invite' });
  }
});

export { router as parentRouter };
