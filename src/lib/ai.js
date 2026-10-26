// Shared helper for the AI Studio. Uses the same ANTHROPIC_API_KEY as the negotiator.
const MODEL = 'claude-haiku-4-5-20251001';

export async function askClaude({ system, content, maxTokens = 1500, timeoutMs = 50000 }) {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: 'AI is not switched on yet. The site owner must add ANTHROPIC_API_KEY in Vercel.' };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
    });
    const j = await r.json();
    if (!r.ok) { console.error('AI_FAULT:', j?.error?.type, j?.error?.message); return { ok: false, error: 'The AI could not answer right now. Try again in a minute.' }; }
    const text = (j.content || []).map((c) => c.text || '').join('').trim();
    return text ? { ok: true, text } : { ok: false, error: 'The AI returned nothing. Try again.' };
  } catch (e) {
    console.error('AI_FAULT:', e);
    return { ok: false, error: e.name === 'AbortError' ? 'The AI took too long. Try a shorter request.' : 'The AI could not answer right now.' };
  } finally { clearTimeout(t); }
}

export function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export const HONESTY = `Rules you must follow: Never invent statistics, market sizes, prices, competitor names, laws or sources. If you do not know something, say so and say how the owner can find out (for example: count competitors on Google Maps, ask 10 past customers, get 3 supplier quotes, check gov.uk or the local council). Use only numbers the owner gave you. Label guesses as guesses. Plain, simple English, short sentences, no jargon.`;
