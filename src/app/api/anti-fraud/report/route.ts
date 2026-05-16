import { NextRequest, NextResponse } from 'next/server'
import { antiFraudEngine } from '@/lib/anti-fraud'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, eventType, severity, details, ipAddress, deviceFingerprint } = body

    if (!eventType || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, severity' },
        { status: 400 }
      )
    }

    const validSeverities = ['low', 'medium', 'high', 'critical']
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
        { status: 400 }
      )
    }

    // Get geolocation from IP if provided
    let country: string | undefined
    let city: string | undefined

    if (ipAddress) {
      const ipResult = await antiFraudEngine.checkIp(ipAddress)
      country = ipResult.country
      city = ipResult.city
    }

    await antiFraudEngine.logFraudEvent({
      userId,
      eventType,
      severity,
      details: details || {},
      ipAddress,
      deviceFingerprint,
      country,
      city,
    })

    // Get the created event ID
    const events = await db.fraudEvent.findMany({
      where: { eventType },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { id: true },
    })

    return NextResponse.json({
      success: true,
      eventId: events[0]?.id || null,
    })
  } catch (error) {
    console.error('[Anti-Fraud Report] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error while logging fraud event' },
      { status: 500 }
    )
  }
}
