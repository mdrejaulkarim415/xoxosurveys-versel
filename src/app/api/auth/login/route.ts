import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { antiFraudEngine } from '@/lib/anti-fraud'
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
      // Log failed login attempt
      await antiFraudEngine.logActivity({
        userId: user.id,
        action: 'login_failed',
        details: { reason: 'invalid_password' },
      })

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

    // 6. Check IP for VPN/proxy
    const ipResult = await antiFraudEngine.checkIp(ipAddress)

    // Block Tor users from logging in
    if (ipResult.isTor) {
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'tor_detected',
        severity: 'critical',
        details: { action: 'login' },
        ipAddress,
        deviceFingerprint,
        country: ipResult.country,
        city: ipResult.city,
      })
      return NextResponse.json(
        { error: 'Login from Tor networks is not allowed' },
        { status: 403 }
      )
    }

    // If user is VPN-blocked and using VPN, reject
    if (user.isVpnBlocked && ipResult.isVpn) {
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'vpn_blocked_login_attempt',
        severity: 'high',
        details: { action: 'login', vpnScore: ipResult.riskScore },
        ipAddress,
        deviceFingerprint,
        country: ipResult.country,
        city: ipResult.city,
      })
      return NextResponse.json(
        { error: 'Your account has been restricted from VPN connections. Please use a regular internet connection.' },
        { status: 403 }
      )
    }

    // 7. Run full risk assessment
    const riskAssessment = await antiFraudEngine.assessRisk({
      userId: user.id,
      ipAddress,
      deviceFingerprint,
      action: 'login',
    })

    if (riskAssessment.shouldBlock) {
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'blocked_login',
        severity: 'critical',
        details: {
          riskScore: riskAssessment.riskScore,
          flags: riskAssessment.flags,
        },
        ipAddress,
        deviceFingerprint,
        country: ipResult.country,
        city: ipResult.city,
      })
      return NextResponse.json(
        { error: 'Login blocked due to suspicious activity. Please contact support.' },
        { status: 403 }
      )
    }

    // 8. Create session
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

    // 9. Update user login info
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        loginCount: { increment: 1 },
        deviceFingerprint: deviceFingerprint || user.deviceFingerprint,
      },
    })

    // 10. Record IP for user
    await antiFraudEngine.recordUserIp({
      userId: user.id,
      ipAddress,
      country: ipResult.country,
      city: ipResult.city,
      isVpn: ipResult.isVpn,
      isProxy: ipResult.isProxy,
      isTor: ipResult.isTor,
    })

    // 11. Log activity
    await antiFraudEngine.logActivity({
      userId: user.id,
      action: 'login',
      details: {
        riskScore: riskAssessment.riskScore,
        flags: riskAssessment.flags,
        isVpn: ipResult.isVpn,
      },
      ipAddress,
      userAgent: request.headers.get('user-agent') || undefined,
      deviceFingerprint,
      country: ipResult.country,
      city: ipResult.city,
    })

    // 12. Log fraud events if flagged
    if (riskAssessment.shouldFlag) {
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'suspicious_login',
        severity: riskAssessment.riskScore >= 60 ? 'high' : 'medium',
        details: {
          riskScore: riskAssessment.riskScore,
          flags: riskAssessment.flags,
          isVpn: ipResult.isVpn,
        },
        ipAddress,
        deviceFingerprint,
        country: ipResult.country,
        city: ipResult.city,
      })
    }

    // Return user data without password hash
    const { passwordHash: _, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      sessionToken,
      riskAssessment: {
        riskScore: riskAssessment.riskScore,
        recommendedAction: riskAssessment.recommendedAction,
        flags: riskAssessment.flags,
      },
    })
  } catch (error) {
    console.error('[Auth Login] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    )
  }
}
