import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { settleAny } from '@/lib/billing';

export const runtime = 'nodejs';

export async function POST(req) {
  const hash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!hash) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const sent = req.headers.get('verif-hash') || '';
    const a = Buffer.from(sent), b = Buffer.from(hash);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ ok: false }, { status: 401 });
    const event = await req.json();
    const ref = event?.data?.tx_ref;
    if (event?.event === 'charge.completed' && ref) await settleAny(ref, 'flutterwave');
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('FLUTTERWAVE_WEBHOOK_FAULT:', e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
