import jwt from 'jsonwebtoken';
import { sql } from '@/lib/db';

export function getSession(req) {
  try {
    const raw = req.headers.get('cookie') || '';
    const m = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith('gnis_session='));
    if (!m) return null;
    const p = jwt.verify(decodeURIComponent(m.slice('gnis_session='.length)), process.env.JWT_SECRET);
    return { ...p, userId: p.userId ?? p.id ?? p.sub, role: p.role };
  } catch {
    return null;
  }
}

export function isOwnerRole(s) {
  return !!s && !!s.userId && (s.role === 'pro' || s.role === 'admin');
}

// Same as getSession, but checks the database too. A deactivated person, or someone whose password was reset
// after they signed in, is refused straight away instead of staying signed in for days. The role is also
// taken from the database, so a changed role takes effect at once.
export async function liveSession(req) {
  const s = getSession(req);
  if (!s || !s.userId) return null;
  try {
    const [u] = await sql`select role, coalesce(suspended, false) as suspended, sessions_valid_after from users where id::text = ${String(s.userId)}`;
    if (!u || u.suspended) return null;
    if (u.sessions_valid_after) {
      const issued = Number(s.iat) * 1000;
      if (!issued || issued < new Date(u.sessions_valid_after).getTime()) return null;
    }
    return { ...s, role: u.role || s.role };
  } catch (e) {
    // If the database check itself fails (for example the v19 SQL has not been run yet), do not lock everyone out.
    console.error('LIVE_SESSION_FAULT:', e?.message);
    return s;
  }
}
