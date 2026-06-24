import fetch from 'node-fetch';
import OpenAI from 'openai';

export interface StaffMember {
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
}

export interface FetchedProgram {
  id: number;
  name: string;
  website: string;
  division: string | null;
  conference: string | null;
  city: string | null;
  state: string | null;
  hasScholarships: boolean | null;
  staff: StaffMember[];
  fetchedAt: string;
}

export interface FetchOptions {
  expanded?: boolean; // include rosterNeeds, GPA, majors in extraction prompt
}

const htmlCache: Record<string, { text: string; fetchedAt: number }> = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function getAIClient(): { client: OpenAI; model: string; isOllama: boolean } | null {
  const ollamaBase = process.env.OLLAMA_BASE_URL;
  if (ollamaBase) {
    return {
      client: new OpenAI({ baseURL: `${ollamaBase}/v1`, apiKey: 'ollama' }),
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      isOllama: true,
    };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && apiKey !== 'sk-your-openai-key-here') {
    return { client: new OpenAI({ apiKey }), model: 'gpt-4o-mini', isOllama: false };
  }
  return null;
}

export async function fetchAndExtract(
  school: { id: number; name: string; website: string },
  opts: FetchOptions = {}
): Promise<FetchedProgram> {
  const ai = getAIClient();
  if (!ai) {
    throw new Error('No AI backend configured. Set OLLAMA_BASE_URL or OPENAI_API_KEY in server/.env.');
  }

  let text: string;
  const cached = htmlCache[school.website];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    text = cached.text;
  } else {
    const res = await (fetch as any)(school.website, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HERS365Bot/1.0)' },
    }).catch(() => null);

    if (!res || !res.ok) {
      throw new Error(`Could not reach ${school.website}`);
    }

    const html: string = await res.text();
    text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 12000);

    htmlCache[school.website] = { text, fetchedAt: Date.now() };
  }

  const baseShape = `{
  "division": string|null,
  "conference": string|null,
  "city": string|null,
  "state": string|null,
  "hasScholarships": boolean|null,
  "staff": [{ "name": string, "title": string, "email": string|null, "phone": string|null }]
}`;

  const expandedShape = `{
  "division": string|null,
  "conference": string|null,
  "city": string|null,
  "state": string|null,
  "hasScholarships": boolean|null,
  "minGpa": string|null,
  "rosterNeeds": { "positions": string[], "notes": string|null }|null,
  "eligibilityNotes": string|null,
  "majorsList": string[]|null,
  "graduationRate": string|null,
  "staff": [{ "name": string, "title": string, "email": string|null, "phone": string|null }]
}`;

  const completion = await ai.client.chat.completions.create({
    model: ai.model,
    messages: [
      {
        role: 'system',
        content: `Extract college athletics program information from website text. Return ONLY a JSON object with no explanation, no markdown, no preamble. Shape: ${opts.expanded ? expandedShape : baseShape}. Use null for any field not found. Do not invent information.`,
      },
      {
        role: 'user',
        content: `School: ${school.name}\nURL: ${school.website}\n\nPage text:\n${text}`,
      },
    ],
    ...(ai.isOllama ? {} : { response_format: { type: 'json_object' as const } }),
  });

  const raw = (completion.choices[0].message.content || '{}')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return {
    id: school.id,
    name: school.name,
    website: school.website,
    division: parsed.division ?? null,
    conference: parsed.conference ?? null,
    city: parsed.city ?? null,
    state: parsed.state ?? null,
    hasScholarships: parsed.hasScholarships ?? null,
    staff: (parsed.staff || []).filter((m: any) => m.name),
    fetchedAt: new Date().toISOString(),
  };
}
