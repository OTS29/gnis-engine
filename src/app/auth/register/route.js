import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const b = await request.json()
    const email = String(b.email || '').trim().toLowerCase()
    if (!email || !b.password || b.password.length < 8) {
      return NextResponse.json({ error: 'Invalid email or password (min 8 chars)' }, { status: 400 })
    }
    const hash = await bcrypt.hash(b.password, 12)
    const rows = await sql`
      insert into users (email, password_hash, name, role, region, skill, rate, address, postcode)
      values (${email}, ${hash}, ${b.name ?? null}, ${b.role ?? 'pro'}, ${b.region ?? null},
              ${b.skill ?? null}, ${b.rate ?? null}, ${b.address ?? null}, ${b.postcode ?? null})
      on conflict (email) do nothing
      returning id`
    if (!rows.length) {
      return NextResponse.json({ error: 'Account already exists' }, { status: 409 })
    }
    return NextResponse.json({ message: 'Registered' }, { status: 201 })
  } catch (e) {
    console.error('REGISTER_FAULT:', e)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}