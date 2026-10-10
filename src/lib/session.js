import jwt from 'jsonwebtoken';

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
