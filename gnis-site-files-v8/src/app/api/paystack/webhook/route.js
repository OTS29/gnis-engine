import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { settleAny } from '@/lib/billing';

export const runtime = 'nodejs';

export async function POST(req) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const raw = await req.text();
    const sig = req.headers.get('x-paystack-signature') || '';
    const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
    const a = Buffer.from(sig), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ ok: false }, { status: 401 });
    const event = JSON.parse(raw);
    if (event.event === 'charge.success' && event.data?.reference) await settleAny(event.data.reference, 'paystack');
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('PAYSTACK_WEBHOOK_FAULT:', e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
