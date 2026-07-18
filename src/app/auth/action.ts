'use server'

import { createClient } from '../../utils/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)



// 2. Added Missing Login Export to clear your terminal warning
export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { error: error.message }
  return { success: true, user: data.user }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  const name = formData.get('name') as string
  const role = formData.get('role') as string                 
  const region = formData.get('region') as string             
  const skill = formData.get('skill') as string
  const rate = formData.get('rate') as string
  const address = formData.get('address') as string
  const postcode = formData.get('postcode') as string
  const verificationMethod = formData.get('verificationMethod') as string 
  const idNumber = formData.get('idNumber') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        role,
        region,
        skill: skill || null,
        rate: rate || null,
        address: address || null,
        postcode: postcode || null,
        verification_method: verificationMethod || null,
        identity_node_number: idNumber || null
      },
    },
  })

  if (error) return { error: error.message }
  return { success: true, user: data.user }
}

export async function verifyOTP(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const token = formData.get('token') as string

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup'
  })

  if (error) return { error: error.message }
  return { success: true, user: data.user }
}

export async function createCheckoutSession(userEmail: string) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_H123456789xyz', 
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: userEmail,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
    });

    return { url: session.url, error: null };
  } catch (error: any) {
    return { url: null, error: error.message as string };
  }
}