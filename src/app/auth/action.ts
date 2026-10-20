'use server'

import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import { sql } from '@/lib/db'
import { headers } from 'next/headers'
import { hit, isBlocked } from '@/lib/rateLimit'

async function callerIp(): Promise<string> {
  const h = await headers()
  return ((h.get('x-forwarded-for') || '').split(',')[0] || h.get('x-real-ip') || 'unknown').trim()
}

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
    const password = String(formData.get('password') || '').slice(0, 200)

    // Slows down password guessing: limits per device and per email address (15 minutes).
    const ip = await callerIp()
    if (!(await hit(`login:ip:${ip}`, 40, 900)).allowed || (await isBlocked(`login:fail:${email}`, 8))) {
      return { error: 'Too many attempts. Please wait 15 minutes and try again.' }
    }

    const [user] = await sql`select * from users where email = ${email} limit 1`
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await hit(`login:fail:${email}`, 8, 900)
      return { error: 'Invalid identity credentials' }
    }

    // Deactivated by an admin: the password was right, but they cannot sign in.
    if (user.suspended) {
      return { error: 'This account has been deactivated. Please contact support.' }
    }

    try {
      await sql`update users set last_login_at = now() where id = ${user.id}`
    } catch (e) {
      console.error('LAST_LOGIN_FAULT:', e)
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
    if (!email || email.length > 120 || password.length < 8 || password.length > 200) {
      return { error: 'Invalid email or password (8 to 200 characters)' }
    }
    if (!(await hit(`signup:ip:${await callerIp()}`, 10, 3600)).allowed) {
      return { error: 'Too many sign-ups from this device. Please try again later.' }
    }

    const name = (formData.get('name') as string) || null
    // Only 'client' or 'pro' can be chosen from the form; nobody can self-register as admin
    const role = formData.get('role') === 'client' ? 'client' : 'pro'
    const region = (formData.get('region') as string) || null
    const country = String((formData.get('country') as string) || '').trim().slice(0, 4) || null
    const skill = (formData.get('skill') as string) || null
    const rate = (formData.get('rate') as string) || null
    const address = (formData.get('address') as string) || null
    const postcode = (formData.get('postcode') as string) || null
    const verificationMethod = (formData.get('verificationMethod') as string) || null
    const rawId = String((formData.get('idNumber') as string) || '').replace(/\s+/g, '')
    // Only the last 4 characters are kept, so a database leak cannot expose a full ID number.
    const idNumber = rawId ? `****${rawId.slice(-4)}` : null

    const hash = await bcrypt.hash(password, 12)

    const rows = await sql`
      insert into users (email, password_hash, name, role, region, skill, rate,
                         address, postcode, verification_method, identity_node_number)
      values (${email}, ${hash}, ${name}, ${role}, ${region}, ${skill}, ${rate},
              ${address}, ${postcode}, ${verificationMethod}, ${idNumber})
      on conflict (email) do nothing
      returning id, name, role`
    if (!rows.length) return { error: 'Account already exists' }

    // Remember which country they chose. A fault here must never block sign-up.
    try {
      if (country) await sql`update users set country = ${country}, last_login_at = now() where id = ${rows[0].id}`
      else await sql`update users set last_login_at = now() where id = ${rows[0].id}`
    } catch (e) {
      console.error('SIGNUP_COUNTRY_FAULT:', e)
    }

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
