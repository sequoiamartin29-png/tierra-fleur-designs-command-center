const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json(503, { error: 'OPENAI_API_KEY is not configured.' });

  let input;
  try { input = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON.' }); }
  const topic = String(input.topic || 'Business growth').slice(0, 100);
  const level = String(input.level || 'Growing').slice(0, 40);
  const recent = Array.isArray(input.recentTitles) ? input.recentTitles.slice(0, 12) : [];

  const prompt = `Create one genuinely new micro-lesson for Tierra Fleur Designs, a Delaware luxury edible landscape and garden design business.
Topic: ${topic}
Level: ${level}
Recently generated lesson titles that MUST NOT be repeated, paraphrased, or lightly reframed: ${recent.length ? recent.join(' | ') : 'none'}.
Use current web information when the topic benefits from current regulations, pricing, trends, tools, or business practices. Focus on a distinct concept, not a rewording of a basic point.
Return ONLY valid JSON with this shape:
{
  "title":"specific unique lesson title",
  "summary":"1-2 sentence overview",
  "freshness":"why this is timely or current",
  "lesson":"4-7 short paragraphs separated by newline characters",
  "tierraFleurExample":"a concrete example using USD where money is relevant",
  "actionSteps":["step 1","step 2","step 3"],
  "challenge":{"question":"one applied question","acceptedAnswers":["key phrase 1","key phrase 2"],"explanation":"brief teaching feedback"},
  "sources":[{"title":"source name","url":"https://..."}]
}`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      tools: [{ type: 'web_search' }],
      input: prompt
    })
  });

  const payload = await response.json();
  if (!response.ok) return json(response.status, { error: payload?.error?.message || 'OpenAI request failed.' });
  const text = payload.output_text || payload.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
  if (!text) return json(502, { error: 'No lesson text returned.' });
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return json(200, JSON.parse(cleaned));
  } catch {
    return json(502, { error: 'The live lesson was not valid JSON.', raw: text.slice(0, 500) });
  }
}
