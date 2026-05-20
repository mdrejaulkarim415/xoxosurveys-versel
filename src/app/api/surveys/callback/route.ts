import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkAndTriggerAutoReview } from '@/lib/account-review'
import { collectPendingReserve } from '@/lib/reserve'

/**
 * Generic Survey Callback / Postback Endpoint
 *
 * Handles postbacks from ANY survey provider (Revtoo, CPX Research, Bitlabs, Inbrain, custom, etc.)
 *
 * Supports both GET and POST requests with various parameter formats:
 * - user_id / sub_id / uid: The user's numeric ID
 * - offer_id / survey_id: The offer/survey ID from the provider
 * - payout: The payout amount from the provider
 * - reward: The reward amount for the user
 * - transaction_id / tid: Unique transaction ID for deduplication
 * - provider: The provider name (revtoo, cpx-research, bitlabs, inbrain, custom)
 * - signature: Security signature (if configured)
 * - ip: User's IP address
 *
 * Also supports internal POST callbacks with JSON body for database survey completion.
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

    // Try to parse POST body as well
    let body: Record<string, string> = {}
    try {
      if (request.method === 'POST') {
        const contentType = request.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          body = await request.json()
        } else {
          // Form-encoded body
          const text = await request.text()
          const params = new URLSearchParams(text)
          params.forEach((value, key) => { body[key] = value })
        }
      }
    } catch {
      // No parseable body
    }

    // ===== EXTERNAL PROVIDER POSTBACK =====
    // Check if this is an external postback (has user_id/sub_id/uid in params)
    const externalUserId = searchParams.get('user_id') || searchParams.get('sub_id') || searchParams.get('uid')
      || body.user_id || body.sub_id || body.uid

    if (externalUserId) {
      return handleExternalPostback(searchParams, body, externalUserId)
    }

    // ===== INTERNAL SURVEY COMPLETION CALLBACK =====
    // This handles internal survey completion with cuid-based IDs
    return handleInternalCallback(body)
  } catch (error) {
    console.error('[Survey Callback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Handle external provider postbacks (from Revtoo, CPX, Bitlabs, etc.)
 */
async function handleExternalPostback(
  searchParams: URLSearchParams,
  body: Record<string, string>,
  externalUserId: string
) {
  const offerId = searchParams.get('offer_id') || searchParams.get('survey_id')
    || body.offer_id || body.survey_id
  const payout = searchParams.get('payout') || body.payout
  const reward = searchParams.get('reward') || body.reward
  const transactionId = searchParams.get('transaction_id') || searchParams.get('tid')
    || body.transaction_id || body.tid
  const ip = searchParams.get('ip') || body.ip
  const provider = searchParams.get('provider') || body.provider || 'unknown'
  const signature = searchParams.get('signature') || body.signature

  const finalPayout = parseFloat(payout || '0')
  const finalReward = parseFloat(reward || '0')

  // Find user by numeric userId
  const user = await db.user.findUnique({
    where: { userId: parseInt(externalUserId) },
  })

  if (!user) {
    console.error(`[Survey Callback] User not found: ${externalUserId}`)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.isBanned) {
    console.log(`[Survey Callback] Banned user attempted: ${externalUserId}`)
    return NextResponse.json({ success: true, message: 'User is banned' })
  }

  if (user.isUnderReview) {
    console.log(`[Survey Callback] Under-review user attempted: ${externalUserId}`)
    return NextResponse.json({ success: true, message: 'Account is under review' })
  }

  // Check for duplicate transaction
  if (transactionId) {
    const existingLog = await db.activityLog.findFirst({
      where: {
        action: { in: ['survey_complete', 'revtoo_survey_complete', 'provider_postback'] },
        details: { contains: transactionId },
      },
    })
    if (existingLog) {
      console.log(`[Survey Callback] Duplicate transaction: ${transactionId}`)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }
  }

  // Calculate reward amount
  // Use reward if provided, otherwise 70% of payout, minimum $0.05
  const earnedAmount = finalReward > 0
    ? finalReward
    : finalPayout > 0
      ? finalPayout * 0.7
      : 0.05

  // Update user balance (with pending reserve collection)
  const { reserveCollected, balanceCredited } = await collectPendingReserve(user.id, earnedAmount)
  await db.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: balanceCredited },
      totalEarned: { increment: earnedAmount },
      surveysCompleted: { increment: 1 },
    },
  })

  // Referral: If user was invited, auto-credit referrer 10% commission
  if (user.invitedBy) {
    try {
      const referrer = await db.user.findUnique({ where: { id: user.invitedBy } })
      if (referrer && !referrer.isBanned) {
        const referralAmount = Math.round(earnedAmount * 0.10 * 1000) / 1000 // 10% commission
        if (referralAmount > 0) {
          // Auto-credit: add to referrer's balance immediately
          await db.user.update({
            where: { id: referrer.id },
            data: {
              balance: { increment: referralAmount },
              totalEarned: { increment: referralAmount },
              referralEarnings: { increment: referralAmount },
            },
          })
          // Record the referral earning as already claimed
          await db.referralEarning.create({
            data: {
              referrerId: referrer.id,
              referredId: user.id,
              referredEmail: user.email,
              surveyReward: earnedAmount,
              referralPercent: 0.10,
              referralAmount,
              status: 'claimed',
              claimedAt: new Date(),
            },
          })
        }
      }
    } catch (e) {
      console.warn('[Survey Callback] Referral earning creation failed:', e)
    }
  }

  // Log activity
  await db.activityLog.create({
    data: {
      userId: user.id,
      action: 'provider_postback',
      details: JSON.stringify({
        provider,
        offerId,
        payout: finalPayout,
        reward: earnedAmount,
        transactionId,
        ip,
        signature: signature || null,
      }),
      ipAddress: ip || null,
    },
  })

  // Create audit log
  await db.auditLog.create({
    data: {
      adminId: 'system',
      action: `${provider}_postback`,
      target: user.id,
      details: JSON.stringify({
        userId: externalUserId,
        provider,
        offerId,
        payout: finalPayout,
        reward: earnedAmount,
        transactionId,
      }),
    },
  })

  console.log(`[Survey Callback] Success: User ${externalUserId} earned $${earnedAmount.toFixed(2)} from ${provider} (offer ${offerId})`)

  // Create notification for the user about the survey/offer completion
  try {
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1).replace(/-/g, ' ')
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'offer_complete',
        title: `Offer Completed!`,
        message: `You earned $${earnedAmount.toFixed(2)} from ${providerName}${offerId ? ` (Offer #${offerId})` : ''}`,
        iconType: 'reward',
        offerwall: providerName,
        rewardAmount: earnedAmount,
        metadata: JSON.stringify({ provider, offerId, payout: finalPayout, reward: earnedAmount, transactionId }),
      },
    })
    console.log(`[Survey Callback] Notification created for user ${user.id}`)
  } catch (e: any) {
    console.warn('[Survey Callback] Notification creation failed:', e?.code || e?.message || e)
    if (e?.code === 'P2021') {
      console.error('[Survey Callback] CRITICAL: Notification table does not exist! Run: npx prisma db push')
    }
  }

  // Auto-trigger account review if user earned $4 or more
  try {
    await checkAndTriggerAutoReview(user.id)
  } catch (e) {
    console.warn('[Survey Callback] Auto-review check failed:', e)
  }

  return NextResponse.json({ success: true, reward: earnedAmount })
}

/**
 * Handle internal survey completion callbacks (from database surveys)
 */
async function handleInternalCallback(body: Record<string, string>) {
  const {
    userId,
    surveyId,
    attemptId,
    status,
    reward,
    timeSpent,
    answers,
    ipAddress,
    deviceFingerprint,
    providerTransactionId,
    signature,
  } = body

  if (!userId || !surveyId) {
    return NextResponse.json({ error: 'User ID and Survey ID are required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const survey = await db.survey.findUnique({ where: { id: surveyId } })
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  // Anti-fraud: Calculate completion speed
  let completionSpeed: number | null = null
  let isFlagged = false
  let flagReason: string | null = null

  const timeSpentNum = parseInt(timeSpent || '0')
  if (attemptId && timeSpentNum > 0) {
    completionSpeed = timeSpentNum / (survey.timeMinutes * 60)
    if (completionSpeed < 0.3) {
      isFlagged = true
      flagReason = 'fast_completion'
    }
  }

  // Update or create attempt
  const updateData: Record<string, unknown> = {
    status: status || 'completed',
    reward: status === 'completed' ? (parseFloat(reward || '0') || survey.reward) : 0,
    timeSpent: timeSpentNum,
    answers: answers ? JSON.stringify(answers) : '{}',
    ipAddress: ipAddress || null,
    deviceFingerprint: deviceFingerprint || null,
    isFlagged,
    flagReason,
    completionSpeed,
    completedAt: new Date(),
  }

  if (attemptId) {
    await db.surveyAttempt.update({
      where: { id: attemptId },
      data: updateData,
    })
  } else {
    await db.surveyAttempt.create({
      data: {
        userId,
        surveyId,
        ...updateData,
      },
    })
  }

  // If completed, update user balance and survey completions
  if (status === 'completed') {
    const earnedReward = parseFloat(reward || '0') || survey.reward

    await db.user.update({
      where: { id: userId },
      data: {
        balance: { increment: earnedReward },
        totalEarned: { increment: earnedReward },
        surveysCompleted: { increment: 1 },
      },
    })

    // Referral: If user was invited, auto-credit referrer 10% commission
    if (user.invitedBy) {
      try {
        const referrer = await db.user.findUnique({ where: { id: user.invitedBy } })
        if (referrer && !referrer.isBanned) {
          const referralAmount = Math.round(earnedReward * 0.10 * 1000) / 1000
          if (referralAmount > 0) {
            // Auto-credit: add to referrer's balance immediately
            await db.user.update({
              where: { id: referrer.id },
              data: {
                balance: { increment: referralAmount },
                totalEarned: { increment: referralAmount },
                referralEarnings: { increment: referralAmount },
              },
            })
            // Record the referral earning as already claimed
            await db.referralEarning.create({
              data: {
                referrerId: referrer.id,
                referredId: user.id,
                referredEmail: user.email,
                surveyReward: earnedReward,
                referralPercent: 0.10,
                referralAmount,
                status: 'claimed',
                claimedAt: new Date(),
              },
            })
          }
        }
      } catch (e) {
        console.warn('[Internal Callback] Referral earning creation failed:', e)
      }
    }

    await db.survey.update({
      where: { id: surveyId },
      data: {
        currentCompletions: { increment: 1 },
      },
    })

    // Create activity log
    await db.activityLog.create({
      data: {
        userId,
        action: 'survey_complete',
        details: JSON.stringify({
          surveyId,
          reward: earnedReward,
          timeSpent: timeSpentNum,
          providerTransactionId: providerTransactionId || null,
        }),
        ipAddress: ipAddress || null,
        deviceFingerprint: deviceFingerprint || null,
      },
    })

    // Create notification for the user about the survey completion
    try {
      const wallName = survey.wallId ? (await db.surveyWall.findUnique({ where: { id: survey.wallId } }))?.name : null
      const offerwallLabel = wallName || 'Internal Survey'
      await db.notification.create({
        data: {
          userId,
          type: 'survey_complete',
          title: 'Survey Completed!',
          message: `You earned $${earnedReward.toFixed(2)} from ${offerwallLabel}`,
          iconType: 'reward',
          offerwall: offerwallLabel,
          rewardAmount: earnedReward,
          metadata: JSON.stringify({ surveyId, reward: earnedReward, timeSpent: timeSpentNum }),
        },
      })
      console.log(`[Internal Callback] Notification created for user ${userId}`)
    } catch (e: any) {
      console.warn('[Internal Callback] Notification creation failed:', e?.code || e?.message || e)
      if (e?.code === 'P2021') {
        console.error('[Internal Callback] CRITICAL: Notification table does not exist! Run: npx prisma db push')
      }
    }

    // If flagged, create fraud event
    if (isFlagged) {
      await db.fraudEvent.create({
        data: {
          userId,
          eventType: flagReason || 'fast_completion',
          severity: 'medium',
          details: JSON.stringify({ surveyId, timeSpent: timeSpentNum, expectedTime: survey.timeMinutes * 60, completionSpeed }),
          ipAddress: ipAddress || null,
          deviceFingerprint: deviceFingerprint || null,
        },
      })

      await db.user.update({
        where: { id: userId },
        data: {
          fraudScore: { increment: 10 },
          isFlagged: true,
        },
      })
    }

    // Auto-trigger account review if user earned $4 or more
    try {
      await checkAndTriggerAutoReview(userId)
    } catch (e) {
      console.warn('[Internal Callback] Auto-review check failed:', e)
    }
  }

  return NextResponse.json({ success: true, status: status || 'completed' })
}
