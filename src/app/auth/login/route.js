import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // You may need to run 'npm install jsonwebtoken'

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // 1. Identify Node Search
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { proProfile: true } // Pull profile data immediately if they are a PRO
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid identity credentials' }, { status: 401 });
    }

    // 2. Cryptographic Hash Verification
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid identity credentials' }, { status: 401 });
    }

    // 3. Generate Secure Access Token
    // Use a strong secret key from your .env file
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_for_dev_only',
      { expiresIn: '7d' }
    );

    // 4. Secure Payload Dispatch
    const response = NextResponse.json({
      message: 'Authentication successful',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        proProfile: user.proProfile
      }
    }, { status: 200 });

    // Set the token in an HTTP-only cookie for security
    response.cookies.set('gnis_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('AUTH_PIPELINE_FAULT:', error);
    return NextResponse.json({ error: 'Internal security execution fault' }, { status: 500 });
  }
}