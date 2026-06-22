import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';

// Stub the AI module: tests must not hit OpenAI, and we need to control the
// supportChat/curateFAQ outputs per case. Each test below resets these mocks
// in beforeEach so individual cases can override behavior.
vi.mock('../ai', () => ({
  supportChat: vi.fn(async () => 'mock-ai-response'),
  curateFAQ:   vi.fn(async () => ({
    curatedQuestion: 'How do I sign up?',
    curatedAnswer:   'Visit the home page and click sign up.',
    category:        'Onboarding',
  })),
}));

// Re-import after vi.mock so the router and test code see the mocked symbols.
import supportRouter from '../supportRoutes';
import { supportChat, curateFAQ } from '../ai';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/support', supportRouter);
  return app;
}

const app = buildApp();

beforeEach(async () => {
  await resetDb();
  vi.mocked(supportChat).mockReset();
  vi.mocked(curateFAQ).mockReset();
  vi.mocked(supportChat).mockResolvedValue('mock-ai-response');
  vi.mocked(curateFAQ).mockResolvedValue({
    curatedQuestion: 'How do I sign up?',
    curatedAnswer:   'Visit the home page and click sign up.',
    category:        'Onboarding',
  });
});

describe('POST /api/support/chat', () => {
  it('returns 400 when question is missing', async () => {
    const res = await request(app).post('/api/support/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('runs the chat, stores the interaction, returns the AI response', async () => {
    const res = await request(app)
      .post('/api/support/chat')
      .send({ question: 'How do I sign up?' });
    expect(res.status).toBe(200);
    expect(res.body.response).toBe('mock-ai-response');
    expect(typeof res.body.interactionId).toBe('number');

    const [row] = await db
      .select()
      .from(schema.supportInteractions)
      .where(eq(schema.supportInteractions.id, res.body.interactionId));
    expect(row.question).toBe('How do I sign up?');
    expect(row.aiResponse).toBe('mock-ai-response');
  });

  it('inserts a new FAQ when curation returns one and no match exists', async () => {
    const res = await request(app)
      .post('/api/support/chat')
      .send({ question: 'How do I sign up?' });
    expect(res.status).toBe(200);

    const faqRows = await db.select().from(schema.faqs);
    expect(faqRows).toHaveLength(1);
    expect(faqRows[0].question).toBe('How do I sign up?');
    expect(faqRows[0].askedCount).toBe(1);
    expect(faqRows[0].isPublic).toBe(true);
  });

  it('bumps the askedCount on an existing FAQ instead of inserting a duplicate', async () => {
    await db.insert(schema.faqs).values({
      question:    'How do I sign up?',
      answer:      'Existing answer',
      askedCount:  4,
      isPublic:    true,
    });

    const res = await request(app)
      .post('/api/support/chat')
      .send({ question: 'A different surface phrasing' });
    expect(res.status).toBe(200);

    const all = await db.select().from(schema.faqs);
    expect(all).toHaveLength(1);
    expect(all[0].askedCount).toBe(5);
  });

  it('skips FAQ insert when curation returns a falsy result', async () => {
    vi.mocked(curateFAQ).mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/support/chat')
      .send({ question: 'orphan question' });
    expect(res.status).toBe(200);

    const all = await db.select().from(schema.faqs);
    expect(all).toEqual([]);
  });

  it('returns 500 when supportChat throws', async () => {
    vi.mocked(supportChat).mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .post('/api/support/chat')
      .send({ question: 'anything' });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed/i);
  });
});

describe('GET /api/support/faqs', () => {
  it('returns only public FAQs ordered by askedCount desc', async () => {
    await db.insert(schema.faqs).values([
      { question: 'Low',    answer: 'a', askedCount: 1,    isPublic: true },
      { question: 'High',   answer: 'a', askedCount: 10,   isPublic: true },
      { question: 'Hidden', answer: 'a', askedCount: 9999, isPublic: false },
    ]);

    const res = await request(app).get('/api/support/faqs');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].question).toBe('High');
    expect(res.body[1].question).toBe('Low');
  });

  it('returns an empty list when no FAQs exist', async () => {
    const res = await request(app).get('/api/support/faqs');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
