'use server'

import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import { sql } from '@/lib/db'

async function createSession(user: { id: string; role: string }) {
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  )
  const jar = await cookies()
  jar.set('gnis_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function login(formData: FormData) {
  try {
    const email = String(formData.get('email') || '').trim().toLowerCase()
    const password = String(formData.get('password') || '')

    const [user] = await sql`select * from users where email = ${email} limit 1`
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return { error: 'Invalid identity credentials' }
    }

    await createSession(user as { id: string; role: string })
    return {
      success: true,
      user: { id: user.id, name: user.name, role: user.role, proProfile: user.pro_profile },
    }
  } catch (e) {
    console.error('LOGIN_FAULT:', e)
    return { error: 'Login failed' }
  }
}

export async function signup(formData: FormData) {
  try {
    const email = String(formData.get('email') || '').trim().toLowerCase()
    const password = String(formData.get('password') || '')
    if (!email || password.length < 8) {
      return { error: 'Invalid email or password (min 8 characters)' }
    }

    const name = (formData.get('name') as string) || null
    // Only 'client' or 'pro' can be chosen from the form; nobody can self-register as admin
    const role = formData.get('role') === 'client' ? 'client' : 'pro'
    const region = (formData.get('region') as string) || null
    const skill = (formData.get('skill') as string) || null
    const rate = (formData.get('rate') as string) || null
    const address = (formData.get('address') as string) || null
    const postcode = (formData.get('postcode') as string) || null
    const verificationMethod = (formData.get('verificationMethod') as string) || null
    const idNumber = (formData.get('idNumber') as string) || null

    const hash = await bcrypt.hash(password, 12)

    const rows = await sql`
      insert into users (email, password_hash, name, role, region, skill, rate,
                         address, postcode, verification_method, identity_node_number)
      values (${email}, ${hash}, ${name}, ${role}, ${region}, ${skill}, ${rate},
              ${address}, ${postcode}, ${verificationMethod}, ${idNumber})
      on conflict (email) do nothing
      returning id, name, role`
    if (!rows.length) return { error: 'Account already exists' }

    await createSession(rows[0] as { id: string; role: string })
    return { success: true, user: rows[0] }
  } catch (e) {
    console.error('SIGNUP_FAULT:', e)
    return { error: 'Registration failed' }
  }
}

export async function logout() {
  const jar = await cookies()
  jar.delete('gnis_session')
  return { success: true }
}

export async function createCheckoutSession(userEmail: string) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { url: null, error: 'Payments are not configured yet' }
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: 'price_H123456789xyz', quantity: 1 }], // replace with your real Stripe price ID
      mode: 'subscription',
      customer_email: userEmail,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
    })
    return { url: session.url, error: null }
  } catch (error: any) {
    return { url: null, error: error.message as string }
  }
}