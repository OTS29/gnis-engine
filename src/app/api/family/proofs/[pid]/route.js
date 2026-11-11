import { sql } from '@/lib/db';
import { guard, json } from '@/lib/familyGuard';

export const runtime = 'nodejs';

// Photos are never public. Only the sender, the professional and an admin can open one.
export async function GET(req, { params }) {
  const g = await guard(req); if (g.res) return g.res;
  const { pid } = await params;
  if (!/^\d{1,12}$/.test(String(pid))) return json({ ok: false, error: 'Not found.' }, 404);
  const [p] = await sql`select p.image_b64, b.sender_user_id, s.owner_id::text as owner_id
    from family_proofs p join family_bookings b on b.id = p.booking_id join sites s on s.id::text = b.site_id where p.id = ${Number(pid)}`;
  if (!p || !(p.sender_user_id === g.user.id || p.owner_id === g.user.id || g.user.role === 'admin')) return json({ ok: false, error: 'Not found.' }, 404);
  return new Response(Buffer.from(p.image_b64, 'base64'), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
}
