import { NextRequest, NextResponse } from 'next/server'
import { antiFraudEngine } from '@/lib/anti-fraud'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fingerprint, userAgent, screenResolution, timezone, platform, canvasHash, webglHash } = body

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Missing required field: fingerprint' },
        { status: 400 }
      )
    }

    // Check if device is blocked
    const blockedDevice = await db.blockedDevice.findUnique({
      where: { fingerprint },
    })

    const isBlocked = !!blockedDevice

    // Check if this device fingerprint is known (has been used before)
    const knownSessions = await db.session.findMany({
      where: { deviceFingerprint: fingerprint },
      take: 5,
    })

    const knownUsers = await db.user.findMany({
      where: { deviceFingerprint: fingerprint },
      take: 5,
    })

    const isKnownDevice = knownSessions.length > 0 || knownUsers.length > 0

    // Calculate a risk score for this device
    let riskScore = 0

    if (isBlocked) {
      riskScore = 100
    } else if (knownUsers.length > 1) {
      // Same device used by multiple users — suspicious
      riskScore += 40
    } else if (knownSessions.length > 5) {
      // Many sessions from same device
      riskScore += 15
    }

    // Generate a server-side fingerprint for comparison
    const serverFingerprint = antiFraudEngine.generateFingerprint({
      userAgent: userAgent || '',
      acceptLanguage: '',
      screenResolution: screenResolution || '',
      timezone: timezone || '',
      platform: platform || '',
      canvasHash: canvasHash || '',
      webglHash: webglHash || '',
    })

    // If client fingerprint doesn't match server-generated one, possible spoofing
    if (fingerprint !== serverFingerprint && userAgent) {
      riskScore += 20
    }

    riskScore = Math.min(100, riskScore)

    return NextResponse.json({
      isBlocked,
      isKnownDevice,
      riskScore,
      deviceFingerprint: fingerprint,
    })
  } catch (error) {
    console.error('[Anti-Fraud Fingerprint] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error during fingerprint check' },
      { status: 500 }
    )
  }
}
