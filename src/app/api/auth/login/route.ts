import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, deviceFingerprint } = body

    // 1. Validate credentials
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // 2. Find user
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // 3. Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash || '')
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // 4. Check if account is banned
    if (user.isBanned) {
      return NextResponse.json(
        { error: `Account suspended: ${user.banReason || 'Violation of terms of service'}` },
        { status: 403 }
      )
    }

    // 5. Get IP from request headers
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'

    // 6. Create session
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
      console.warn('[Login] Session creation failed:', e)
    }

    // 7. Update user login info
    try {
      await db.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
          loginCount: { increment: 1 },
          deviceFingerprint: deviceFingerprint || user.deviceFingerprint,
        },
      })
    } catch (e) {
      console.warn('[Login] User update failed:', e)
    }

    // 8. Try to log activity (non-blocking)
    try {
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: 'login',
          details: JSON.stringify({}),
          ipAddress,
          userAgent: request.headers.get('user-agent') || undefined,
          deviceFingerprint,
        },
      })
    } catch (e) {
      console.warn('[Login] Activity logging failed:', e)
    }

    // Return user data without password hash
    const { passwordHash: _, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      sessionToken,
    })
  } catch (error: any) {
    console.error('[Auth Login] Error:', error)

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

    return NextResponse.json(
      { error: 'Internal server error during login', details: process.env.NODE_ENV === 'development' ? error?.message : undefined },
      { status: 500 }
    )
  }
}
