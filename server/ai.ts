import OpenAI from "openai";
import { logger } from './logger';

// the newest OpenAI model is "gpt-4o", but user specified "GPT-5". OpenAI has not released GPT-5 but we'll use GPT-4o internally as the closest available if needed, or we mock the interface.
// Using GPT-4o for all "GPT-5" labeled logic per instruction
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function assignArchetype(position: string, stats: any): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: "Assign a football player archetype based on position and stats (e.g., 'WR Speedster', 'QB Dual-Threat'). Max 3 words." }, { role: "user", content: `Position: ${position}, Stats: ${JSON.stringify(stats)}` }],
    });
    return response.choices[0].message.content || 'Balanced Athlete';
  } catch (err) {
    return 'Balanced Athlete';
  }
}

export async function generateBotName(): Promise<{ botName: string; personality: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: "Generate a unique AI bot name and personality profile for an athlete. Return JSON { botName, personality }" }],
      response_format: { type: "json_object" }
    });
    if(response.choices[0].message.content) {
        return JSON.parse(response.choices[0].message.content);
    }
    throw new Error('Empty response');
  } catch(err) {
    return { botName: "Coach AI", personality: "Intense and supportive" };
  }
}

export async function chatBot(botId: number, messages: any[], context: any): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `You are the player's personal AI bot. Bot ID: ${botId}. Player Context: ${JSON.stringify(context)}` },
        ...messages
      ]
    });
    return response.choices[0].message.content || 'Offline...';
  } catch (err) {
    logger.error('AI chatBot failed', err instanceof Error ? err : new Error(String(err)));
    return "I am currently offline. Please try again later.";
  }
}

export async function chatNIL(messages: any[]): Promise<string> {
    try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: `You are an expert NIL (Name, Image, Likeness) compliance and branding advisor.` },
            ...messages
          ]
        });
        return response.choices[0].message.content || 'NIL Advisor is busy.';
      } catch (err) {
        logger.error('AI chatNIL failed', err instanceof Error ? err : new Error(String(err)));
        return "NIL Advisor is offline. Please try again later.";
      }
}

export async function generateTrainingPlan(position: string, age: number, level: string): Promise<any> {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: `Create a 1-week flag football training plan for a ${age}yo ${level} ${position}. JSON format: { weeklySchedule: [{day, focus, drills}], goals: string }`}],
            response_format: { type: "json_object" }
        });
        if(response.choices[0].message.content) return JSON.parse(response.choices[0].message.content);
    } catch(err) {
        return { weeklySchedule: [], goals: "Stay active" };
    }
}
export async function supportChat(question: string, context?: any): Promise<string> {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { 
                    role: "system", 
                    content: `You are H.E.R.S.365 AI Support. You provide 24/7 expert assistance for girls flag football, recruiting, NIL, and platform help. 
                    You are connected to the internet and should provide the most up-to-date information. 
                    If you don't know something, be honest. 
                    Context: ${JSON.stringify(context || {})}` 
                },
                { role: "user", content: question }
            ]
        });
        return response.choices[0].message.content || 'I encountered an error.';
    } catch (err) {
        logger.error('AI supportChat failed', err instanceof Error ? err : new Error(String(err)));
        return "I am currently processing too many requests. Please try again or visit our FAQ page.";
    }
}

export async function curateFAQ(question: string, answer: string): Promise<any> {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { 
                    role: "system", 
                    content: `You are an FAQ curator. Clean up the following question and answer to be professional and helpful for other users. Return JSON { curatedQuestion, curatedAnswer, category }` 
                },
                { role: "user", content: `Question: ${question}\nAnswer: ${answer}` }
            ],
            response_format: { type: "json_object" }
        });
        if(response.choices[0].message.content) return JSON.parse(response.choices[0].message.content);
    } catch(err) {
        return { curatedQuestion: question, curatedAnswer: answer, category: "General" };
    }
}
