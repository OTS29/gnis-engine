import { sql } from '@/lib/db';

export function clientIp(req) {
  const f = req.headers.get('x-forwarded-for') || '';
  return (f.split(',')[0] || req.headers.get('x-real-ip') || 'unknown').trim();
}

let ready;
async function ensure() {
  if (!ready) {
    ready = sql`create table if not exists rate_limits (key text primary key, hits integer not null default 0, reset_at timestamptz not null)`;
  }
  return ready;
}

// Counts one hit. Returns { allowed, hits }. Fails open if the database is unavailable.
export async function hit(key, max, windowSec) {
  try {
    await ensure();
    const [r] = await sql`
      insert into rate_limits (key, hits, reset_at) values (${key}, 1, now() + make_interval(secs => ${windowSec}))
      on conflict (key) do update set
        hits = case when rate_limits.reset_at < now() then 1 else rate_limits.hits + 1 end,
        reset_at = case when rate_limits.reset_at < now() then now() + make_interval(secs => ${windowSec}) else rate_limits.reset_at end
      returning hits`;
    return { allowed: r.hits <= max, hits: r.hits };
  } catch (e) {
    console.error('RATE_LIMIT_FAULT:', e);
    return { allowed: true, hits: 0 };
  }
}

// Reads without counting.
export async function isBlocked(key, max) {
  try {
    await ensure();
    const [r] = await sql`select hits from rate_limits where key = ${key} and reset_at > now()`;
    return !!r && r.hits >= max;
  } catch {
    return false;
  }
}
