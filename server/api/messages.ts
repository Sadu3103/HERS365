import express from 'express';
import { and, eq, or, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../auth';

const router = express.Router();
router.use(requireAuth);

// Returns { userId, role } for the authenticated caller.
function caller(req: express.Request) {
  const u = (req as any).user;
  return { userId: Number(u.userId), role: u.role as string };
}

// GET /api/messages/conversations — one row per chat partner
router.get('/conversations', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const isCoach = role === 'coach';

    // Pull every message involving this user, newest first.
    const rows = await db
      .select()
      .from(schema.messages)
      .where(isCoach ? eq(schema.messages.coachId, userId) : eq(schema.messages.athleteId, userId))
      .orderBy(desc(schema.messages.createdAt));

    // Group by the partner id (the other side of the pair).
    const byPartner = new Map<number, { last: any; unread: number }>();
    for (const m of rows) {
      const partnerId = isCoach ? m.athleteId : m.coachId;
      if (partnerId == null) continue;
      const entry = byPartner.get(partnerId) ?? { last: m, unread: 0 };
      // rows are desc, so the first seen is the latest
      if (!byPartner.has(partnerId)) entry.last = m;
      if (!m.read && m.senderId !== userId) entry.unread += 1;
      byPartner.set(partnerId, entry);
    }

    // Resolve partner names.
    const partnerIds = [...byPartner.keys()];
    const partnerTable = isCoach ? schema.players : schema.coaches;
    const names = new Map<number, string>();
    for (const pid of partnerIds) {
      const [row] = await db.select().from(partnerTable).where(eq(partnerTable.id, pid)).limit(1);
      names.set(pid, row?.name ?? 'Unknown');
    }

    const data = partnerIds.map((pid) => {
      const { last, unread } = byPartner.get(pid)!;
      return {
        partnerId: pid,
        partnerName: names.get(pid) ?? 'Unknown',
        partnerRole: isCoach ? 'athlete' : 'coach',
        lastMessage: last.content,
        lastMessageAt: last.createdAt,
        unreadCount: unread,
      };
    });

    // unread first, then most recent
    data.sort((a, b) => {
      if ((b.unreadCount > 0 ? 1 : 0) !== (a.unreadCount > 0 ? 1 : 0)) {
        return (b.unreadCount > 0 ? 1 : 0) - (a.unreadCount > 0 ? 1 : 0);
      }
      return new Date(b.lastMessageAt as any).getTime() - new Date(a.lastMessageAt as any).getTime();
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[messages/conversations]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// GET /api/messages/conversations/:partnerId/messages — full thread, oldest first
router.get('/conversations/:partnerId/messages', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const isCoach = role === 'coach';
    const partnerId = parseInt(req.params.partnerId, 10);
    if (Number.isNaN(partnerId)) {
      return res.status(400).json({ success: false, error: 'Invalid partner id' });
    }

    const pairWhere = isCoach
      ? and(eq(schema.messages.coachId, userId), eq(schema.messages.athleteId, partnerId))
      : and(eq(schema.messages.athleteId, userId), eq(schema.messages.coachId, partnerId));

    const limit = Number(req.query.limit ?? 50);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db
      .select()
      .from(schema.messages)
      .where(pairWhere)
      .orderBy(schema.messages.createdAt)
      .limit(limit)
      .offset(offset);

    const data = rows.map((m) => ({
      id: m.id,
      content: m.content,
      isFromMe: m.senderId === userId,
      read: m.read,
      createdAt: m.createdAt,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('[messages/thread]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// POST /api/messages — send a message to a partner
router.post('/', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const isCoach = role === 'coach';
    const { partnerId, content } = req.body ?? {};

    if (!partnerId || !content) {
      return res.status(400).json({ success: false, error: 'partnerId and content are required' });
    }

    const partnerTable = isCoach ? schema.players : schema.coaches;
    const [partner] = await db.select({ id: partnerTable.id })
      .from(partnerTable)
      .where(eq(partnerTable.id, Number(partnerId)))
      .limit(1);
    if (!partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }

    const [row] = await db
      .insert(schema.messages)
      .values({
        coachId: isCoach ? userId : Number(partnerId),
        athleteId: isCoach ? Number(partnerId) : userId,
        senderId: userId,
        senderType: isCoach ? 'coach' : 'athlete',
        content: String(content),
        read: false,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: { id: row.id, content: row.content, isFromMe: true, read: false, createdAt: row.createdAt },
    });
  } catch (err) {
    console.error('[messages/send]', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// PUT /api/messages/read — mark inbound messages in a thread as read
router.put('/read', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const isCoach = role === 'coach';
    const { partnerId } = req.body ?? {};
    if (!partnerId) {
      return res.status(400).json({ success: false, error: 'partnerId is required' });
    }

    const pairWhere = isCoach
      ? and(eq(schema.messages.coachId, userId), eq(schema.messages.athleteId, Number(partnerId)))
      : and(eq(schema.messages.athleteId, userId), eq(schema.messages.coachId, Number(partnerId)));

    await db
      .update(schema.messages)
      .set({ read: true })
      .where(and(pairWhere, sql`${schema.messages.senderId} <> ${userId}`));

    res.json({ success: true });
  } catch (err) {
    console.error('[messages/read]', err);
    res.status(500).json({ success: false, error: 'Failed to mark read' });
  }
});

// GET /api/messages/unread-count — total inbound unread
router.get('/unread-count', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const isCoach = role === 'coach';
    const sideWhere = isCoach ? eq(schema.messages.coachId, userId) : eq(schema.messages.athleteId, userId);

    const rows = await db
      .select()
      .from(schema.messages)
      .where(and(sideWhere, eq(schema.messages.read, false), sql`${schema.messages.senderId} <> ${userId}`));

    res.json({ success: true, data: { totalUnread: rows.length } });
  } catch (err) {
    console.error('[messages/unread-count]', err);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

// GET /api/messages/requests — pending inbound contact requests
router.get('/requests', async (req, res) => {
  try {
    const { userId } = caller(req);
    const rows = await db
      .select()
      .from(schema.messageRequests)
      .where(and(eq(schema.messageRequests.receiverId, userId), eq(schema.messageRequests.status, 'pending')))
      .orderBy(desc(schema.messageRequests.createdAt));

    // Resolve sender (athlete) names.
    const data = [];
    for (const r of rows) {
      let senderName = 'Unknown';
      if (r.athleteId != null) {
        const [a] = await db.select().from(schema.players).where(eq(schema.players.id, r.athleteId)).limit(1);
        senderName = a?.name ?? 'Unknown';
      }
      data.push({ id: r.id, athleteId: r.athleteId, senderName, content: r.content, createdAt: r.createdAt });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[messages/requests]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

// POST /api/messages/requests/:id/respond — approve or reject a request
router.post('/requests/:id/respond', async (req, res) => {
  try {
    const { userId } = caller(req);
    const id = parseInt(req.params.id, 10);
    const { action } = req.body ?? {};
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be approve or reject' });
    }

    const [reqRow] = await db.select().from(schema.messageRequests).where(eq(schema.messageRequests.id, id)).limit(1);
    if (!reqRow) return res.status(404).json({ success: false, error: 'Request not found' });
    if (reqRow.receiverId !== userId) {
      return res.status(403).json({ success: false, error: 'Not your request to respond to' });
    }

    await db
      .update(schema.messageRequests)
      .set({ status: action === 'approve' ? 'approved' : 'rejected' })
      .where(eq(schema.messageRequests.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error('[messages/respond]', err);
    res.status(500).json({ success: false, error: 'Failed to respond to request' });
  }
});

export { router as messagesRouter };
