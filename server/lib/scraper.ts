import OpenAI from 'openai';

export interface StaffMember {
  name: string;
  title: string;
  email?: string | null;
  phone?: string | null;
}

export interface FetchedProgram {
  staff: StaffMember[];
  fetchedAt: Date;
}

interface FetchOptions {
  expanded?: boolean;
}

const htmlCache = new Map<string, { html: string; at: number }>();

export function getAIClient(): { client: OpenAI; model: string; isOllama: boolean } | null {
  if (process.env.OLLAMA_BASE_URL) {
    return {
      client: new OpenAI({ baseURL: `${process.env.OLLAMA_BASE_URL}/v1`, apiKey: 'ollama' }),
      model: process.env.OLLAMA_MODEL || 'llama3',
      isOllama: true,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: 'gpt-4o-mini',
      isOllama: false,
    };
  }
  return null;
}

export async function fetchAndExtract(
  school: { id: number; name: string; website: string },
  opts: FetchOptions = {},
): Promise<FetchedProgram> {
  const ai = getAIClient();
  if (!ai) throw new Error('No AI backend configured');

  // 1-hour HTML cache
  const cached = htmlCache.get(school.website);
  let html: string;
  if (cached && Date.now() - cached.at < 3600_000) {
    html = cached.html;
  } else {
    const resp = await fetch(school.website, { headers: { 'User-Agent': 'HERS365-bot/1.0' } });
    html = await resp.text();
    // Strip tags, collapse whitespace, cap at 12k chars
    html = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
    htmlCache.set(school.website, { html, at: Date.now() });
  }

  const basePrompt = `Extract the coaching staff from this ${school.name} flag football program page.
Return ONLY valid JSON with this shape:
{
  "staff": [{ "name": "string", "title": "string", "email": "string|null", "phone": "string|null" }]
}`;

  const expandedExtra = opts.expanded
    ? `\nAlso include at top level: "minGpa": "string|null", "rosterNeeds": ["positions"], "majorsList": ["majors"]`
    : '';

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: basePrompt + expandedExtra },
    { role: 'user', content: html },
  ];

  const reqOpts: OpenAI.ChatCompletionCreateParamsNonStreaming = {
    model: ai.model,
    messages,
    temperature: 0,
    max_tokens: 1000,
  };
  if (!ai.isOllama) {
    (reqOpts as unknown as Record<string, unknown>).response_format = { type: 'json_object' };
  }

  const completion = await ai.client.chat.completions.create(reqOpts);
  const raw = completion.choices[0]?.message?.content ?? '{}';

  // Ollama sometimes prepends preamble text before the JSON
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : '{}');

  return {
    staff: Array.isArray(parsed.staff) ? parsed.staff : [],
    fetchedAt: new Date(),
  };
}
