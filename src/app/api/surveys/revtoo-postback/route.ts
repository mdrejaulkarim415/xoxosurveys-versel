import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkAndTriggerAutoReview } from '@/lib/account-review'

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

    // Revtoo postback parameters (support both snake_case and camelCase)
    const userId = searchParams.get('user_id') || searchParams.get('sub_id') || searchParams.get('subId') || searchParams.get('userId')
    const offerId = searchParams.get('offer_id') || searchParams.get('offerId')
    const payout = searchParams.get('payout')
    const reward = searchParams.get('reward') || searchParams.get('reward_value')
    const transactionId = searchParams.get('transaction_id') || searchParams.get('tid') || searchParams.get('transId')
    const ip = searchParams.get('ip')
    const signature = searchParams.get('signature')
    const status = searchParams.get('status')

    console.log('[Revtoo Postback] Received:', {
      userId, offerId, payout, reward, transactionId, status, ip,
      allParams: Object.fromEntries(searchParams.entries()),
    })

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

    const finalUserId = userId || body.user_id || body.sub_id || body.subId
    const finalOfferId = offerId || body.offer_id
    const finalPayout = parseFloat(payout || body.payout || '0')
    const finalReward = parseFloat(reward || body.reward || body.reward_value || '0')
    const finalTransactionId = transactionId || body.transaction_id || body.tid || body.transId
    const finalIp = ip || body.ip

    // Handle RevToo status: only credit on completed/status=1/status=approved
    if (status && status !== '1' && status !== 'completed' && status !== 'approved') {
      console.log(`[Revtoo Postback] Ignored - status: ${status}`)
      return NextResponse.json({ success: true, message: `Status: ${status}` })
    }

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

    if (user.isBanned) {
      console.log(`[Revtoo Postback] Banned user attempted: ${finalUserId}`)
      return NextResponse.json({ success: true, message: 'User is banned' })
    }

    if (user.isUnderReview) {
      console.log(`[Revtoo Postback] Under-review user attempted: ${finalUserId}`)
      return NextResponse.json({ success: true, message: 'Account is under review' })
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

    // Calculate reward amount - use wall-specific revenue percent if available, otherwise global default, then fallback
    let userPercent = 70 // Default 70% to user, 30% to admin

    // Try to get global default from admin settings
    try {
      const revSetting = await db.adminSettings.findUnique({ where: { key: 'defaultUserRevenuePercent' } })
      if (revSetting && Number(revSetting.value) > 0) {
        userPercent = Number(revSetting.value)
      }
    } catch { /* ignore */ }

    // Try to get wall-specific override from the survey wall config
    // The offer_id can help us identify which wall this came from
    if (finalOfferId) {
      try {
        const walls = await db.surveyWall.findMany({
          where: { provider: 'revtoo', isActive: true },
          select: { id: true, config: true },
        })
        for (const wall of walls) {
          try {
            const config = JSON.parse(wall.config || '{}')
            if (config.userRevenuePercent && Number(config.userRevenuePercent) > 0) {
              userPercent = Number(config.userRevenuePercent)
              break // Use first matching RevToo wall's config
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }

    const earnedAmount = finalReward > 0 ? finalReward : finalPayout > 0 ? finalPayout * (userPercent / 100) : 0.05

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

    // Auto-trigger account review if user earned $4 or more
    try {
      await checkAndTriggerAutoReview(user.id)
    } catch (e) {
      console.warn('[Revtoo Postback] Auto-review check failed:', e)
    }

    return NextResponse.json({ success: true, reward: earnedAmount })
  } catch (error) {
    console.error('[Revtoo Postback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
