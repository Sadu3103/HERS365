import express from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';

const router = express.Router();

function cannedResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('password')) {
    return 'To reset your password, go to the login page and click "Forgot Password". You will receive a reset link at your registered email address within a few minutes.';
  }
  if (q.includes('coach')) {
    return 'Make sure your profile visibility is set to "Public" in your privacy settings. Coaches search by position, state, and grad year — filling out all three fields significantly increases your discoverability.';
  }
  if (q.includes('subscription') || q.includes('pay')) {
    return 'HERS365 Pro is $9.99/month and unlocks unlimited highlight uploads, direct coach messaging, and advanced analytics. Upgrade anytime from your profile settings under "Subscription".';
  }
  if (q.includes('delete') || q.includes('remove')) {
    return 'For account deletion or data removal requests, please contact support@hers365.com directly. Our team will process your request within 3 business days.';
  }
  return 'Thanks! Our team will review and respond soon.';
}

// GET /api/faqs — public FAQs, optional ?category= filter
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const conditions = [eq(schema.faqs.isPublic, true)];
    if (category && typeof category === 'string') {
      conditions.push(eq(schema.faqs.category, category));
    }
    const rows = await db
      .select()
      .from(schema.faqs)
      .where(and(...conditions));
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[faqs/list]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch FAQs' });
  }
});

// GET /api/faqs/categories — distinct category values from public FAQs
router.get('/categories', async (req, res) => {
  try {
    const rows = await db
      .selectDistinct({ category: schema.faqs.category })
      .from(schema.faqs)
      .where(eq(schema.faqs.isPublic, true));
    const categories = rows.map((r) => r.category).filter(Boolean);
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('[faqs/categories]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// POST /api/faqs/ask — submit a question, get canned AI response
router.post('/ask', async (req, res) => {
  try {
    const { question, category } = req.body ?? {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, error: 'question is required' });
    }

    const aiResponse = cannedResponse(question.trim());

    await db.insert(schema.faqs).values({
      question: question.trim(),
      answer: aiResponse,
      category: category && typeof category === 'string' ? category : 'General',
      isPublic: false,
    });

    await db.insert(schema.supportInteractions).values({
      question: question.trim(),
      aiResponse,
      playerId: null,
      tags: category ?? null,
    });

    res.json({ success: true, data: { aiResponse } });
  } catch (err) {
    console.error('[faqs/ask]', err);
    res.status(500).json({ success: false, error: 'Failed to submit question' });
  }
});

export { router as faqsRouter };
