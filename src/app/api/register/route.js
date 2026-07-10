import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // ✅ Fixed import path
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    // Parse the incoming JSON body array
    const body = await req.json();
    const { email, password, name, role, primarySkill, baseRate, postcode } = body;

    // Validate absolute baseline credential requirements
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing core identity parameters' }, { status: 400 });
    }

    // Check data integrity for existing identity entries
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return NextResponse.json({ error: 'Identity vector already mapped in system runtime' }, { status: 409 });
    }

    // Process secure credential hashing
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Clean and validate localized geography values
    const formattedPostcode = postcode ? postcode.trim().toUpperCase() : 'UNKNOWN';

    // Initialize transactional database execution block
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          name,
          role: role === 'pro' ? 'PRO' : 'CLIENT'
        }
      });

      // If registered account is a Professional node, append metadata profile immediately
      if (role === 'pro') {
        await tx.proProfile.create({
          data: {
            userId: user.id,
            primarySkill: primarySkill || "General Provider",
            baseRate: baseRate || "£25",
            operatingRadius: formattedPostcode, // Maps your clean UK postcode block
            isAutonomous: true // Ensures their AI Twin control hook is live by default
          }
        });
      }

      return user;
    });

    // Strip sensitive hash elements out before dispatching payload confirmation
    const { passwordHash: _, ...secureUserPayload } = newUser;

    return NextResponse.json({
      message: 'System identity node initialized successfully',
      user: secureUserPayload
    }, { status: 201 });

  } catch (error) {
    console.error('CRITICAL RUNTIME EXCEPTION:', error);
    return NextResponse.json({ error: 'Internal pipeline execution fault' }, { status: 500 });
  }
}