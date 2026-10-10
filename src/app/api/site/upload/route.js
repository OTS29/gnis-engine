import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSession, isOwnerRole } from '@/lib/session';
import { hit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const OK = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Photo storage is not connected yet. Add a Blob store in Vercel Storage.' }, { status: 500 });
    }
    if (!(await hit(`upload:${s.userId}`, 80, 3600)).allowed) {
      return NextResponse.json({ ok: false, error: 'Too many uploads this hour. Try again later.' }, { status: 429 });
    }
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return NextResponse.json({ ok: false, error: 'No file' }, { status: 400 });
    if (!OK.includes(file.type)) return NextResponse.json({ ok: false, error: 'Use a JPG, PNG or WebP image' }, { status: 400 });
    if (file.size > 3_000_000) return NextResponse.json({ ok: false, error: 'Image is too large' }, { status: 413 });

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const blob = await put(`sites/${s.userId}/photo.${ext}`, file, { access: 'public', addRandomSuffix: true, contentType: file.type, cacheControlMaxAge: 31536000 });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    console.error('SITE_UPLOAD_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Upload failed' }, { status: 500 });
  }
}
