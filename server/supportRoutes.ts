import { Router } from "express";
import { db } from "./db";
import { faqs, supportInteractions } from "./schema";
import { supportChat, curateFAQ } from "./ai";
import { eq, sql } from "drizzle-orm";

const router = Router();

// Support Chat Endpoint
router.post("/chat", async (req, res) => {
  const { playerId, question, context } = req.body;
  if (!question) return res.status(400).json({ error: "Question is required" });

  try {
    const aiResponse = await supportChat(question, context);

    // Save interaction
    const [interaction] = await db.insert(supportInteractions).values({
      playerId: playerId || null,
      question,
      aiResponse,
      tags: JSON.stringify([]),
    }).returning();

    // Automatically check if this should be an FAQ candidate
    // In a real app, an admin would review this, but for now we'll simulate the "automation"
    const curated = await curateFAQ(question, aiResponse);
    if(curated) {
        // Check if question exists already or if it's high quality
        const existing = await db.select().from(faqs).where(eq(faqs.question, curated.curatedQuestion)).limit(1);
        if(existing.length > 0) {
            // Update asked count
            await db.update(faqs).set({ askedCount: (existing[0].askedCount || 0) + 1, lastAskedAt: new Date().toISOString() }).where(eq(faqs.id, existing[0].id));
        } else {
            // Add to FAQ list
            await db.insert(faqs).values({
                question: curated.curatedQuestion,
                answer: curated.curatedAnswer,
                category: curated.category,
                isPublic: true,
                askedCount: 1,
            });
        }
    }

    res.json({ response: aiResponse, interactionId: interaction.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// Fetch FAQs
router.get("/faqs", async (req, res) => {
  try {
    const allFaqs = await db.select().from(faqs).where(eq(faqs.isPublic, true)).orderBy(sql`${faqs.askedCount} DESC`);
    res.json(allFaqs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch FAQs" });
  }
});

export default router;
