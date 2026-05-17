import { NextRequest, NextResponse } from 'next/server'
import { antiFraudEngine } from '@/lib/anti-fraud'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ipAddress, deviceFingerprint, action, additionalData } = body

    if (!ipAddress || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: ipAddress, action' },
        { status: 400 }
      )
    }

    const validActions = ['login', 'survey_start', 'survey_complete', 'cashout', 'register']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await antiFraudEngine.assessRisk({
      userId,
      ipAddress,
      deviceFingerprint,
      action,
      additionalData,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Anti-Fraud Check] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error during risk assessment' },
      { status: 500 }
    )
  }
}
