import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()

    const [user] = await sql`select * from users where email = ${email} limit 1`

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid identity credentials' },
        { status: 401 }
      )
    }

    const isMatch = await bcrypt.compare(body.password || '', user.password_hash)
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid identity credentials' },
        { status: 401 }
      )
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    const response = NextResponse.json(
      {
        message: 'Authentication successful',
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          proProfile: user.pro_profile
        }
      },
      { status: 200 }
    )

    response.cookies.set('gnis_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('AUTH_PIPELINE_FAULT:', error)
    return NextResponse.json(
      { error: 'Internal security execution fault' },
      { status: 500 }
    )
  }
}