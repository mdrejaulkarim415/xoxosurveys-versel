import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Revtoo Postback Endpoint
 *
 * Revtoo calls this endpoint when a user completes a survey.
 * Typical Revtoo postback parameters:
 * - user_id: The user ID we passed in the redirect URL
 * - offer_id: The offer ID (56443 for Revtoo Surveys)
 * - payout: The payout amount
 * - reward: The reward amount given to user
 * - transaction_id: Unique transaction ID from Revtoo
 * - ip: User's IP address
 * - signature: Security signature (if configured)
 */
export async function GET(request: NextRequest) {
  return handlePostback(request)
}

export async function POST(request: NextRequest) {
  return handlePostback(request)
}

async function handlePostback(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Revtoo postback parameters
    const userId = searchParams.get('user_id') || searchParams.get('sub_id')
    const offerId = searchParams.get('offer_id')
    const payout = searchParams.get('payout')
    const reward = searchParams.get('reward')
    const transactionId = searchParams.get('transaction_id') || searchParams.get('tid')
    const ip = searchParams.get('ip')
    const signature = searchParams.get('signature')

    // Also try to get from POST body
    let body: Record<string, string> = {}
    try {
      if (request.method === 'POST') {
        const json = await request.json()
        body = json
      }
    } catch {
      // No JSON body
    }

    const finalUserId = userId || body.user_id || body.sub_id
    const finalOfferId = offerId || body.offer_id
    const finalPayout = parseFloat(payout || body.payout || '0')
    const finalReward = parseFloat(reward || body.reward || '0')
    const finalTransactionId = transactionId || body.transaction_id || body.tid
    const finalIp = ip || body.ip

    if (!finalUserId) {
      return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 })
    }

    // Find user by userId (numeric ID starting from 100)
    const user = await db.user.findUnique({
      where: { userId: parseInt(finalUserId) },
    })

    if (!user) {
      console.error(`[Revtoo Postback] User not found: ${finalUserId}`)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for duplicate transaction
    if (finalTransactionId) {
      const existingLog = await db.activityLog.findFirst({
        where: {
          action: 'revtoo_survey_complete',
          details: { contains: finalTransactionId },
        },
      })
      if (existingLog) {
        console.log(`[Revtoo Postback] Duplicate transaction: ${finalTransactionId}`)
        return NextResponse.json({ success: true, message: 'Already processed' })
      }
    }

    // Calculate reward amount - use reward if provided, otherwise use payout
    const earnedAmount = finalReward > 0 ? finalReward : finalPayout > 0 ? finalPayout * 0.7 : 0.05

    // Verify offer is our target offer (56443)
    if (finalOfferId && finalOfferId !== '56443') {
      console.log(`[Revtoo Postback] Unexpected offer ID: ${finalOfferId}`)
    }

    // Update user balance
    await db.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: earnedAmount },
        totalEarned: { increment: earnedAmount },
        surveysCompleted: { increment: 1 },
      },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'revtoo_survey_complete',
        details: JSON.stringify({
          offerId: finalOfferId,
          payout: finalPayout,
          reward: earnedAmount,
          transactionId: finalTransactionId,
          ip: finalIp,
          provider: 'revtoo',
        }),
        ipAddress: finalIp || null,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        adminId: 'system',
        action: 'revtoo_postback',
        target: user.id,
        details: JSON.stringify({
          userId: finalUserId,
          offerId: finalOfferId,
          payout: finalPayout,
          reward: earnedAmount,
          transactionId: finalTransactionId,
        }),
      },
    })

    console.log(`[Revtoo Postback] Success: User ${finalUserId} earned $${earnedAmount.toFixed(2)} for offer ${finalOfferId}`)

    return NextResponse.json({ success: true, reward: earnedAmount })
  } catch (error) {
    console.error('[Revtoo Postback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
