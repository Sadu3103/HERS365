import express from 'express';
import { db } from '../db';
import * as schema from '../schema';

const router = express.Router();

// POST /api/contact — public contact form submission
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body ?? {};

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    if (typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    const question = `[Contact] From: ${name} <${email}> | Subject: ${subject}\n\n${message}`;
    const aiResponse = `Thanks for reaching out, ${name}. We'll respond within 24 hours.`;

    await db.insert(schema.supportInteractions).values({
      question,
      aiResponse,
      playerId: null,
      tags: subject,
    });

    res.json({ success: true, message: "We'll respond within 24 hours." });
  } catch (err) {
    console.error('[contact/post]', err);
    res.status(500).json({ success: false, error: 'Failed to submit contact form' });
  }
});

export { router as contactRouter };
