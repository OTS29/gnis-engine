import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@/utils/supabase/server'

export async function POST(request) {
  try {
    const body = await request.json()

    const {
      email,
      password,
      name,
      role,
      region,
      skill,
      rate,
      address,
      postcode,
      verificationMethod,
      idNumber
    } = body

    // 1. Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required identity fields' },
        { status: 400 }
      )
    }

    // 2. Supabase client
    const supabase = await createClient()

    // 3. Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Identity already exists' },
        { status: 409 }
      )
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // 5. Insert new GNIS identity node
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email,
          passwordHash,
          name,
          role,
          region,
          skill,
          rate,
          address,
          postcode,
          verificationMethod,
          idNumber,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('GNIS_SIGNUP_FAULT:', insertError)
      return NextResponse.json(
        { error: 'Identity creation fault' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Identity created successfully',
        user: newUser
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('GNIS_SIGNUP_PIPELINE_FAULT:', error)
    return NextResponse.json(
      { error: 'Internal identity execution fault' },
      { status: 500 }
    )
  }
}
