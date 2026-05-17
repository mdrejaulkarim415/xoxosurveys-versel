import { NextRequest, NextResponse } from 'next/server'
import { antiFraudEngine } from '@/lib/anti-fraud'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ipAddress } = body

    if (!ipAddress) {
      return NextResponse.json(
        { error: 'Missing required field: ipAddress' },
        { status: 400 }
      )
    }

    // Basic IP format validation
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipPattern.test(ipAddress)) {
      return NextResponse.json(
        { error: 'Invalid IP address format. Expected IPv4.' },
        { status: 400 }
      )
    }

    const result = await antiFraudEngine.checkIp(ipAddress)

    // Also check the blocked IPs table
    const blockedIp = await db.blockedIp.findUnique({
      where: { ipAddress },
    })

    return NextResponse.json({
      ...result,
      isBlocked: !!blockedIp,
      blockReason: blockedIp?.reason || null,
    })
  } catch (error) {
    console.error('[Anti-Fraud IP Check] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error during IP check' },
      { status: 500 }
    )
  }
}
