import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createClient } from '@/utils/supabase/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    const supabase = await createClient()

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid identity credentials' },
        { status: 401 }
      )
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
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
          proProfile: user.proProfile
        }
      },
      { status: 200 }
    )

    response.cookies.set('gnis_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
