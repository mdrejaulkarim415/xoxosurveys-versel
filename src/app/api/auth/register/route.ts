import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { antiFraudEngine } from '@/lib/anti-fraud'
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

    // Validate password strength (minimum 8 chars, at least 1 number, 1 letter)
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

    // 3. Check IP for VPN/proxy
    const ipResult = await antiFraudEngine.checkIp(ipAddress)

    if (ipResult.isTor) {
      await antiFraudEngine.logFraudEvent({
        eventType: 'tor_detected',
        severity: 'critical',
        details: { action: 'register', email },
        ipAddress,
        deviceFingerprint,
        country: ipResult.country,
        city: ipResult.city,
      })
      return NextResponse.json(
        { error: 'Registration from Tor networks is not allowed. Please use a regular internet connection.' },
        { status: 403 }
      )
    }

    if (ipResult.isVpn && ipResult.riskScore >= 60) {
      await antiFraudEngine.logFraudEvent({
        eventType: 'vpn_detected',
        severity: 'high',
        details: { action: 'register', email, vpnScore: ipResult.riskScore },
        ipAddress,
        deviceFingerprint,
        country: ipResult.country,
        city: ipResult.city,
      })
      return NextResponse.json(
        { error: 'Registration from VPN/proxy connections is not allowed. Please disable your VPN and try again.' },
        { status: 403 }
      )
    }

    // 4. Check for duplicate accounts (same IP/device)
    const duplicateCheck = await antiFraudEngine.checkDuplicateAccount({
      ipAddress,
      deviceFingerprint,
      currentUserEmail: email,
    })

    if (duplicateCheck.isDuplicate && duplicateCheck.confidence >= 0.7) {
      await antiFraudEngine.logFraudEvent({
        eventType: 'multiple_accounts',
        severity: 'high',
        details: {
          action: 'register',
          email,
          matchingUsers: duplicateCheck.matchingUsers,
          confidence: duplicateCheck.confidence,
        },
        ipAddress,
        deviceFingerprint,
        country: ipResult.country,
        city: ipResult.city,
      })
      return NextResponse.json(
        { error: 'Multiple accounts are not allowed. If you believe this is an error, please contact support.' },
        { status: 403 }
      )
    }

    // 5. Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // 6. Handle invite code
    let invitedBy: string | null = null
    if (inviteCode) {
      const referrer = await db.user.findUnique({
        where: { inviteCode },
      })
      if (referrer) {
        invitedBy = referrer.id
      }
    }

    // 7. Hash password
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    // 8. Generate unique invite code for new user
    const userInviteCode = 'XOXO-' + crypto.randomBytes(4).toString('hex').toUpperCase()

    // 8b. Generate sequential userId starting from 100
    const lastUser = await db.user.findFirst({
      orderBy: { userId: 'desc' },
      select: { userId: true },
    })
    const nextUserId = lastUser ? lastUser.userId + 1 : 100

    // 9. Calculate initial fraud score based on IP check
    const initialFraudScore = Math.min(100, ipResult.riskScore * 0.5)

    // 9b. Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')

    // 10. Create user
    const user = await db.user.create({
      data: {
        userId: nextUserId,
        email,
        passwordHash,
        name: name || null,
        inviteCode: userInviteCode,
        invitedBy,
        deviceFingerprint: deviceFingerprint || null,
        fraudScore: initialFraudScore,
        fraudFlags: JSON.stringify(
          ipResult.isVpn ? ['vpn_ip_on_register'] : []
        ),
        isFlagged: initialFraudScore > 30,
        isVpnBlocked: ipResult.isVpn && ipResult.riskScore >= 50,
        lastLoginIp: ipAddress,
        lastLoginAt: new Date(),
        loginCount: 1,
        emailVerificationToken,
        emailVerificationSentAt: new Date(),
      },
    })

    // 11. Record IP for user
    await antiFraudEngine.recordUserIp({
      userId: user.id,
      ipAddress,
      country: ipResult.country,
      city: ipResult.city,
      isVpn: ipResult.isVpn,
      isProxy: ipResult.isProxy,
      isTor: ipResult.isTor,
    })

    // 12. Log activity
    await antiFraudEngine.logActivity({
      userId: user.id,
      action: 'register',
      details: {
        ipRiskScore: ipResult.riskScore,
        isVpn: ipResult.isVpn,
        isProxy: ipResult.isProxy,
        isTor: ipResult.isTor,
        hasInviteCode: !!inviteCode,
      },
      ipAddress,
      userAgent: request.headers.get('user-agent') || undefined,
      deviceFingerprint,
      country: ipResult.country,
      city: ipResult.city,
    })

    // 13. Update referrer's friends count
    if (invitedBy) {
      await db.user.update({
        where: { id: invitedBy },
        data: { friendsInvited: { increment: 1 } },
      })
    }

    // 14. Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await db.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        deviceFingerprint: deviceFingerprint || null,
        ipAddress,
        userAgent: request.headers.get('user-agent') || null,
        country: ipResult.country,
        city: ipResult.city,
        isVpn: ipResult.isVpn,
        expiresAt,
      },
    })

    // 15. Send verification email and welcome email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${emailVerificationToken}`

    // Send emails in parallel (non-blocking - don't fail registration if email fails)
    Promise.all([
      sendVerificationEmail(email, verificationUrl),
      sendWelcomeEmail(email, name || null),
    ]).then(([verificationSent, welcomeSent]) => {
      if (!verificationSent) console.warn(`[Register] Verification email failed for ${email}`)
      if (!welcomeSent) console.warn(`[Register] Welcome email failed for ${email}`)
    }).catch(err => {
      console.error('[Register] Email sending error:', err)
    })

    // Return user data without password hash
    const { passwordHash: _, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      sessionToken,
      emailVerificationRequired: true,
      ...(process.env.NODE_ENV === 'development' && { verificationUrl }),
      warnings: ipResult.isVpn ? ['VPN detected: Some features may be limited'] : [],
    }, { status: 201 })
  } catch (error) {
    console.error('[Auth Register] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    )
  }
}
