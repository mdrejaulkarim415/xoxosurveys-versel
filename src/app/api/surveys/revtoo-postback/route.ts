import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { antiFraudEngine } from '@/lib/anti-fraud'

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
 *
 * Anti-fraud features:
 * - Duplicate detection by transaction_id (same offer_id can repeat legitimately)
 * - VPN/proxy/Tor detection and blocking
 * - Fraud score check
 * - Earning velocity check
 * - Bot pattern detection
 * - Rate limiting
 * - Admin revenue percent applied
 */
export async function GET(request: NextRequest) {
  return handlePostback(request)
}

export async function POST(request: NextRequest) {
  return handlePostback(request)
}

/**
 * Get admin revenue percent from settings
 */
async function getAdminRevenuePercent(): Promise<number> {
  try {
    const setting = await db.adminSettings.findUnique({
      where: { key: 'adminRevenuePercent' },
    })
    if (setting) {
      const val = parseFloat(setting.value)
      if (!isNaN(val) && val >= 0 && val <= 100) return val
    }
  } catch {}
  return 30 // Default: 30% admin, 70% user
}

/**
 * Get fraud prevention settings from admin settings
 */
async function getFraudSettings(): Promise<{
  fraudScoreBlockThreshold: number
  maxSurveyCompletionsPerHour: number
  maxEarningPerHour: number
  autoBlockVpn: boolean
  autoBlockProxy: boolean
  autoBlockTor: boolean
}> {
  try {
    const settings = await db.adminSettings.findMany({
      where: { key: { in: ['fraudScoreBlockThreshold', 'maxSurveyCompletionsPerHour', 'maxEarningPerHour', 'autoBlockVpn', 'autoBlockProxy', 'autoBlockTor'] } },
    })
    const map: Record<string, string> = {}
    settings.forEach(s => { map[s.key] = s.value })

    return {
      fraudScoreBlockThreshold: parseFloat(map.fraudScoreBlockThreshold || '50') || 50,
      maxSurveyCompletionsPerHour: parseInt(map.maxSurveyCompletionsPerHour || '20') || 20,
      maxEarningPerHour: parseFloat(map.maxEarningPerHour || '10') || 10,
      autoBlockVpn: map.autoBlockVpn !== 'false',
      autoBlockProxy: map.autoBlockProxy !== 'false',
      autoBlockTor: map.autoBlockTor !== 'false',
    }
  } catch {
    return {
      fraudScoreBlockThreshold: 50,
      maxSurveyCompletionsPerHour: 20,
      maxEarningPerHour: 10,
      autoBlockVpn: true,
      autoBlockProxy: true,
      autoBlockTor: true,
    }
  }
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

    // Get the request IP (for fraud checking the postback itself)
    const requestIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || finalIp || 'unknown'

    // Find user by userId (numeric ID starting from 100)
    const user = await db.user.findUnique({
      where: { userId: parseInt(finalUserId) },
      select: {
        id: true,
        userId: true,
        email: true,
        isBanned: true,
        isFlagged: true,
        fraudScore: true,
        isVpnBlocked: true,
        deviceFingerprint: true,
      },
    })

    if (!user) {
      console.error(`[Revtoo Postback] User not found: ${finalUserId}`)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ===== ANTI-FRAUD: Check if banned =====
    if (user.isBanned) {
      console.log(`[Revtoo Postback] Banned user attempted: ${finalUserId}`)
      return NextResponse.json({ success: true, message: 'User is banned' })
    }

    // ===== ANTI-FRAUD: Duplicate transaction check by transaction_id (NOT offer_id) =====
    // Same offer can be completed multiple times legitimately, so we use transaction_id for dedup
    if (finalTransactionId) {
      const existingLog = await db.activityLog.findFirst({
        where: {
          userId: user.id,
          action: { in: ['revtoo_survey_complete', 'provider_postback', 'survey_complete'] },
          details: { contains: finalTransactionId },
        },
      })
      if (existingLog) {
        console.log(`[Revtoo Postback] Duplicate transaction: ${finalTransactionId}`)
        return NextResponse.json({ success: true, message: 'Already processed' })
      }
    }

    // ===== ANTI-FRAUD: Get fraud settings =====
    const fraudSettings = await getFraudSettings()

    // ===== ANTI-FRAUD: Check fraud score =====
    if (user.fraudScore >= fraudSettings.fraudScoreBlockThreshold) {
      console.log(`[Revtoo Postback] User ${finalUserId} blocked - fraud score ${user.fraudScore} >= ${fraudSettings.fraudScoreBlockThreshold}`)
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'blocked_high_fraud_score',
        severity: 'high',
        details: { offerId: finalOfferId, transactionId: finalTransactionId, fraudScore: user.fraudScore, payout: finalPayout },
        ipAddress: requestIp,
      })
      return NextResponse.json({ success: true, message: 'Processed' })
    }

    // ===== ANTI-FRAUD: VPN/proxy/Tor detection =====
    if (requestIp && requestIp !== 'unknown') {
      const ipResult = await antiFraudEngine.checkIp(requestIp)
      
      if (fraudSettings.autoBlockTor && ipResult.isTor) {
        console.log(`[Revtoo Postback] Tor IP blocked: ${requestIp}`)
        await antiFraudEngine.logFraudEvent({
          userId: user.id,
          eventType: 'tor_detected_postback',
          severity: 'critical',
          details: { offerId: finalOfferId, transactionId: finalTransactionId, ip: requestIp },
          ipAddress: requestIp,
        })
        await antiFraudEngine.autoBlockUser(user.id, `Tor detected on postback IP ${requestIp}`, 'flag')
        return NextResponse.json({ success: true, message: 'Processed' })
      }

      if (fraudSettings.autoBlockVpn && ipResult.isVpn) {
        console.log(`[Revtoo Postback] VPN IP flagged: ${requestIp}`)
        await antiFraudEngine.logFraudEvent({
          userId: user.id,
          eventType: 'vpn_detected_postback',
          severity: 'high',
          details: { offerId: finalOfferId, transactionId: finalTransactionId, ip: requestIp },
          ipAddress: requestIp,
        })
        await antiFraudEngine.autoBlockUser(user.id, `VPN detected on postback IP ${requestIp}`, 'flag')
      }
    }

    // ===== ANTI-FRAUD: Earning velocity check =====
    const velocityResult = await antiFraudEngine.checkEarningVelocity(user.id)
    if (velocityResult.isSuspicious && velocityResult.severity === 'critical') {
      console.log(`[Revtoo Postback] Critical earning velocity for user ${finalUserId}: $${velocityResult.earnedLast1h.toFixed(2)} in 1h`)
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'critical_earning_velocity',
        severity: 'critical',
        details: { 
          offerId: finalOfferId, transactionId: finalTransactionId,
          earnedLast1h: velocityResult.earnedLast1h,
          earnedLast24h: velocityResult.earnedLast24h,
          completionsLast1h: velocityResult.completionsLast1h,
          completionsLast24h: velocityResult.completionsLast24h,
        },
        ipAddress: requestIp,
      })
      await antiFraudEngine.autoBlockUser(user.id, `Critical earning velocity: $${velocityResult.earnedLast1h.toFixed(2)} in 1h`, 'block')
      return NextResponse.json({ success: true, message: 'Processed' })
    }

    // ===== ANTI-FRAUD: Rate limiting =====
    const rateLimit = await antiFraudEngine.checkRateLimit(user.id, 'revtoo_survey_complete', fraudSettings.maxSurveyCompletionsPerHour, 60)
    if (rateLimit.isLimited) {
      console.log(`[Revtoo Postback] Rate limited user ${finalUserId}: ${rateLimit.currentCount} completions in ${rateLimit.windowMinutes}min`)
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'postback_rate_limited',
        severity: 'high',
        details: { 
          offerId: finalOfferId, transactionId: finalTransactionId,
          completionsLast1h: rateLimit.currentCount,
          maxAllowed: fraudSettings.maxSurveyCompletionsPerHour,
        },
        ipAddress: requestIp,
      })
      return NextResponse.json({ success: true, message: 'Processed' })
    }

    // ===== ANTI-FRAUD: Bot pattern detection =====
    const botResult = await antiFraudEngine.checkBotPattern(user.id)
    if (botResult.isBot) {
      console.log(`[Revtoo Postback] Bot pattern detected for user ${finalUserId}: ${botResult.patterns.join(', ')}`)
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'bot_detected_postback',
        severity: 'critical',
        details: { 
          offerId: finalOfferId, transactionId: finalTransactionId,
          botPatterns: botResult.patterns,
          botConfidence: botResult.confidence,
        },
        ipAddress: requestIp,
      })
      await antiFraudEngine.autoBlockUser(user.id, `Bot pattern detected: ${botResult.patterns.join(', ')}`, 'ban')
      return NextResponse.json({ success: true, message: 'Processed' })
    }

    // ===== Calculate reward with admin revenue percent =====
    const adminRevenuePercent = await getAdminRevenuePercent()
    
    // Use reward if provided, otherwise use payout as base
    const baseReward = finalReward > 0 ? finalReward : finalPayout > 0 ? finalPayout : 0.05

    // Apply admin revenue percent: user gets (100 - adminPercent)% of the base reward
    const earnedAmount = Math.round(baseReward * (1 - adminRevenuePercent / 100) * 1000) / 1000

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
          baseReward,
          reward: earnedAmount,
          adminRevenuePercent,
          transactionId: finalTransactionId,
          ip: finalIp,
          provider: 'revtoo',
        }),
        ipAddress: finalIp || requestIp || null,
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
          baseReward,
          reward: earnedAmount,
          adminRevenuePercent,
          transactionId: finalTransactionId,
        }),
      },
    })

    // Record the IP for this user
    if (requestIp && requestIp !== 'unknown') {
      const ipResult = await antiFraudEngine.checkIp(requestIp)
      await antiFraudEngine.recordUserIp({
        userId: user.id,
        ipAddress: requestIp,
        country: ipResult.country,
        city: ipResult.city,
        isVpn: ipResult.isVpn,
        isProxy: ipResult.isProxy,
        isTor: ipResult.isTor,
      })
    }

    console.log(`[Revtoo Postback] Success: User ${finalUserId} earned $${earnedAmount.toFixed(2)} for offer ${finalOfferId} (tx ${finalTransactionId})`)

    return NextResponse.json({ success: true, reward: earnedAmount })
  } catch (error) {
    console.error('[Revtoo Postback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
