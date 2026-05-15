import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, inviteCode, deviceFingerprint } = body

    // 1. Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one letter and one number' },
        { status: 400 }
      )
    }

    // 2. Get IP from request headers
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'

    // 3. Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // 4. Handle invite code
    let invitedBy: string | null = null
    if (inviteCode) {
      try {
        const referrer = await db.user.findUnique({
          where: { inviteCode },
        })
        if (referrer) {
          invitedBy = referrer.id
        }
      } catch (e) {
        console.warn('[Register] Invite code lookup failed:', e)
      }
    }

    // 5. Hash password
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    // 6. Generate unique invite code for new user
    const userInviteCode = 'XOXO-' + crypto.randomBytes(4).toString('hex').toUpperCase()

    // 7. Generate sequential userId starting from 100
    let nextUserId = 100
    try {
      const lastUser = await db.user.findFirst({
        orderBy: { userId: 'desc' },
        select: { userId: true },
      })
      nextUserId = lastUser ? lastUser.userId + 1 : 100
    } catch (e) {
      console.warn('[Register] Could not get last userId, using default:', e)
    }

    // 8. Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')

    // 9. Create user
    const user = await db.user.create({
      data: {
        userId: nextUserId,
        email,
        passwordHash,
        name: name || null,
        inviteCode: userInviteCode,
        invitedBy,
        deviceFingerprint: deviceFingerprint || null,
        fraudScore: 0,
        fraudFlags: '[]',
        isFlagged: false,
        isVpnBlocked: false,
        lastLoginIp: ipAddress,
        lastLoginAt: new Date(),
        loginCount: 1,
        emailVerificationToken,
        emailVerificationSentAt: new Date(),
      },
    })

    // 10. Try to record IP (non-blocking)
    try {
      await db.userIp.upsert({
        where: {
          userId_ipAddress: {
            userId: user.id,
            ipAddress,
          },
        },
        create: {
          userId: user.id,
          ipAddress,
          country: 'Unknown',
          city: 'Unknown',
          isVpn: false,
          isProxy: false,
          isTor: false,
        },
        update: {
          country: 'Unknown',
          city: 'Unknown',
        },
      })
    } catch (e) {
      console.warn('[Register] IP recording failed:', e)
    }

    // 11. Try to log activity (non-blocking)
    try {
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: 'register',
          details: JSON.stringify({ hasInviteCode: !!inviteCode }),
          ipAddress,
          userAgent: request.headers.get('user-agent') || undefined,
          deviceFingerprint,
        },
      })
    } catch (e) {
      console.warn('[Register] Activity logging failed:', e)
    }

    // 12. Update referrer's friends count (non-blocking)
    if (invitedBy) {
      try {
        await db.user.update({
          where: { id: invitedBy },
          data: { friendsInvited: { increment: 1 } },
        })
      } catch (e) {
        console.warn('[Register] Referrer update failed:', e)
      }
    }

    // 13. Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    try {
      await db.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          deviceFingerprint: deviceFingerprint || null,
          ipAddress,
          userAgent: request.headers.get('user-agent') || null,
          country: 'Unknown',
          city: 'Unknown',
          isVpn: false,
          expiresAt,
        },
      })
    } catch (e) {
      console.warn('[Register] Session creation failed:', e)
    }

    // 14. Send verification email (non-blocking)
    // Build base URL from request headers (works on Vercel)
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL
    const baseUrl = (envBaseUrl && envBaseUrl !== 'http://localhost:3000')
      ? envBaseUrl
      : (host ? `${protocol}://${host}` : 'http://localhost:3000')
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${emailVerificationToken}`

    Promise.all([
      sendVerificationEmail(email, verificationUrl),
      sendWelcomeEmail(email, name || null),
    ]).catch(err => {
      console.error('[Register] Email sending error:', err)
    })

    // Return user data without password hash
    const { passwordHash: _, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      sessionToken,
      emailVerificationRequired: true,
      ...(process.env.NODE_ENV === 'development' && { verificationUrl }),
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Auth Register] Error:', error)

    // Provide more specific error messages
    if (error?.code === 'P1001') {
      return NextResponse.json(
        { error: 'Database connection failed. Please check DATABASE_URL environment variable.' },
        { status: 500 }
      )
    }
    if (error?.code === 'P2021') {
      return NextResponse.json(
        { error: 'Database tables not found. Please run: npx prisma db push' },
        { status: 500 }
      )
    }
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error during registration', details: process.env.NODE_ENV === 'development' ? error?.message : undefined },
      { status: 500 }
    )
  }
}
