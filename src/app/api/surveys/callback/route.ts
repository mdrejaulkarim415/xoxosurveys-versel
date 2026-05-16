import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { antiFraudEngine } from '@/lib/anti-fraud'

/**
 * Check if an IP is private/local (load balancer, CDN, etc.)
 * These should NOT be used for fraud detection
 */
function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true
  return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|169\.254\.|::1|fc|fe80)/.test(ip)
}

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
 * Anti-fraud features:
 * - Duplicate detection by transaction_id (NOT offer_id, since same offer can be repeated)
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
      return handleExternalPostback(searchParams, body, externalUserId, request)
    }

    // ===== INTERNAL SURVEY COMPLETION CALLBACK =====
    // This handles internal survey completion with cuid-based IDs
    return handleInternalCallback(body, request)
  } catch (error) {
    console.error('[Survey Callback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Handle external provider postbacks (from Revtoo, CPX, Bitlabs, etc.)
 * Enhanced with anti-fraud checks
 */
async function handleExternalPostback(
  searchParams: URLSearchParams,
  body: Record<string, string>,
  externalUserId: string,
  request: NextRequest
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

  // Get the request IP (for fraud checking the postback itself)
  // x-forwarded-for may contain multiple IPs; find the first public (non-private) one
  const forwardedFor = request.headers.get('x-forwarded-for')
  const requestIp = forwardedFor
    ? forwardedFor.split(',').map(ip => ip.trim()).find(ip => ip && !isPrivateOrLocalIp(ip)) || forwardedFor.split(',')[0]?.trim()
    : ip || 'unknown'

  // Find user by numeric userId
  const user = await db.user.findUnique({
    where: { userId: parseInt(externalUserId) },
    select: {
      id: true,
      userId: true,
      email: true,
      isBanned: true,
      isFlagged: true,
      fraudScore: true,
      isVpnBlocked: true,
      deviceFingerprint: true,
      ips: true,
    },
  })

  if (!user) {
    console.error(`[Survey Callback] User not found: ${externalUserId}`)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // ===== ANTI-FRAUD: Check if banned =====
  if (user.isBanned) {
    console.log(`[Survey Callback] Banned user attempted: ${externalUserId}`)
    return NextResponse.json({ success: true, message: 'User is banned' })
  }

  // ===== ANTI-FRAUD: Duplicate transaction check by transaction_id (NOT offer_id) =====
  // Same offer_id can be completed multiple times legitimately, so we use transaction_id for dedup
  if (transactionId) {
    const existingLog = await db.activityLog.findFirst({
      where: {
        userId: user.id,
        action: { in: ['survey_complete', 'revtoo_survey_complete', 'provider_postback'] },
        details: { contains: transactionId },
      },
    })
    if (existingLog) {
      console.log(`[Survey Callback] Duplicate transaction: ${transactionId}`)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }
  }

  // ===== ANTI-FRAUD: Get fraud settings =====
  const fraudSettings = await getFraudSettings()

  // ===== ANTI-FRAUD: Check fraud score =====
  if (user.fraudScore >= fraudSettings.fraudScoreBlockThreshold) {
    console.log(`[Survey Callback] User ${externalUserId} blocked - fraud score ${user.fraudScore} >= ${fraudSettings.fraudScoreBlockThreshold}`)
    // Log fraud event but still return success to the provider (don't reveal rejection)
    await antiFraudEngine.logFraudEvent({
      userId: user.id,
      eventType: 'blocked_high_fraud_score',
      severity: 'high',
      details: { provider, offerId, transactionId, fraudScore: user.fraudScore, payout: finalPayout },
      ipAddress: requestIp,
    })
    return NextResponse.json({ success: true, message: 'Processed' })
  }

  // ===== ANTI-FRAUD: VPN/proxy/Tor detection =====
  if (requestIp && requestIp !== 'unknown') {
    const ipResult = await antiFraudEngine.checkIp(requestIp)
    
    if (fraudSettings.autoBlockTor && ipResult.isTor) {
      console.log(`[Survey Callback] Tor IP blocked: ${requestIp}`)
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'tor_detected_postback',
        severity: 'critical',
        details: { provider, offerId, transactionId, ip: requestIp, ipResult },
        ipAddress: requestIp,
      })
      await antiFraudEngine.autoBlockUser(user.id, `Tor detected on postback IP ${requestIp}`, 'flag')
      return NextResponse.json({ success: true, message: 'Processed' })
    }

    if (fraudSettings.autoBlockVpn && ipResult.isVpn) {
      console.log(`[Survey Callback] VPN IP flagged: ${requestIp}`)
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'vpn_detected_postback',
        severity: 'high',
        details: { provider, offerId, transactionId, ip: requestIp, ipResult },
        ipAddress: requestIp,
      })
      // Flag the user but still allow the postback (just reduce reward)
      await antiFraudEngine.autoBlockUser(user.id, `VPN detected on postback IP ${requestIp}`, 'flag')
    }
  }

  // ===== ANTI-FRAUD: Earning velocity check =====
  const velocityResult = await antiFraudEngine.checkEarningVelocity(user.id)
  if (velocityResult.isSuspicious && velocityResult.severity === 'critical') {
    console.log(`[Survey Callback] Critical earning velocity for user ${externalUserId}: ${velocityResult.earnedLast1h} in 1h`)
    await antiFraudEngine.logFraudEvent({
      userId: user.id,
      eventType: 'critical_earning_velocity',
      severity: 'critical',
      details: { 
        provider, offerId, transactionId,
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
  const rateLimit = await antiFraudEngine.checkRateLimit(user.id, 'provider_postback', fraudSettings.maxSurveyCompletionsPerHour, 60)
  if (rateLimit.isLimited) {
    console.log(`[Survey Callback] Rate limited user ${externalUserId}: ${rateLimit.currentCount} completions in ${rateLimit.windowMinutes}min`)
    await antiFraudEngine.logFraudEvent({
      userId: user.id,
      eventType: 'postback_rate_limited',
      severity: 'high',
      details: { 
        provider, offerId, transactionId,
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
    console.log(`[Survey Callback] Bot pattern detected for user ${externalUserId}: ${botResult.patterns.join(', ')}`)
    await antiFraudEngine.logFraudEvent({
      userId: user.id,
      eventType: 'bot_detected_postback',
      severity: 'critical',
      details: { 
        provider, offerId, transactionId,
        botPatterns: botResult.patterns,
        botConfidence: botResult.confidence,
      },
      ipAddress: requestIp,
    })
    await antiFraudEngine.autoBlockUser(user.id, `Bot pattern detected: ${botResult.patterns.join(', ')}`, 'ban')
    return NextResponse.json({ success: true, message: 'Processed' })
  }

  // ===== Calculate reward amount with admin revenue percent =====
  const adminRevenuePercent = await getAdminRevenuePercent()
  
  // Use reward if provided, otherwise calculate from payout
  const baseReward = finalReward > 0
    ? finalReward
    : finalPayout > 0
      ? finalPayout
      : 0.05

  // Apply admin revenue percent: user gets (100 - adminPercent)% of the base reward
  const earnedAmount = Math.round(baseReward * (1 - adminRevenuePercent / 100) * 1000) / 1000

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
      action: 'provider_postback',
      details: JSON.stringify({
        provider,
        offerId,
        payout: finalPayout,
        baseReward,
        reward: earnedAmount,
        adminRevenuePercent,
        transactionId,
        ip,
        signature: signature || null,
      }),
      ipAddress: ip || requestIp || null,
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
        baseReward,
        reward: earnedAmount,
        adminRevenuePercent,
        transactionId,
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

  console.log(`[Survey Callback] Success: User ${externalUserId} earned $${earnedAmount.toFixed(2)} from ${provider} (offer ${offerId}, tx ${transactionId})`)

  return NextResponse.json({ success: true, reward: earnedAmount })
}

/**
 * Handle internal survey completion callbacks (from database surveys)
 * Enhanced with anti-fraud checks
 */
async function handleInternalCallback(body: Record<string, string>, request: NextRequest) {
  const {
    userId,
    surveyId,
    attemptId,
    status,
    reward,
    timeSpent,
    answers,
    ipAddress: bodyIp,
    deviceFingerprint,
    providerTransactionId,
    signature,
  } = body

  if (!userId || !surveyId) {
    return NextResponse.json({ error: 'User ID and Survey ID are required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ 
    where: { id: userId },
    select: {
      id: true,
      isBanned: true,
      fraudScore: true,
      isFlagged: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // ===== ANTI-FRAUD: Check if banned =====
  if (user.isBanned) {
    return NextResponse.json({ error: 'Account is suspended' }, { status: 403 })
  }

  const survey = await db.survey.findUnique({ 
    where: { id: surveyId },
    include: { wall: true },
  })
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  // ===== ANTI-FRAUD: Duplicate check by providerTransactionId =====
  if (providerTransactionId) {
    const existingLog = await db.activityLog.findFirst({
      where: {
        userId,
        action: { in: ['survey_complete', 'provider_postback'] },
        details: { contains: providerTransactionId },
      },
    })
    if (existingLog) {
      console.log(`[Internal Callback] Duplicate transaction: ${providerTransactionId}`)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }
  }

  // ===== ANTI-FRAUD: Get fraud settings =====
  const fraudSettings = await getFraudSettings()

  // ===== ANTI-FRAUD: Check fraud score =====
  if (user.fraudScore >= fraudSettings.fraudScoreBlockThreshold) {
    return NextResponse.json({ error: 'Account restricted due to suspicious activity' }, { status: 403 })
  }

  // Get IP from request
  const requestIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || bodyIp || 'unknown'
  const finalIp = requestIp === 'unknown' ? (bodyIp || null) : requestIp

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

  // ===== ANTI-FRAUD: VPN/proxy check for internal surveys =====
  if (finalIp && survey.wall.blockVpn) {
    const ipResult = await antiFraudEngine.checkIp(finalIp)
    if (fraudSettings.autoBlockTor && ipResult.isTor) {
      await antiFraudEngine.logFraudEvent({
        userId,
        eventType: 'tor_detected_survey',
        severity: 'critical',
        details: { surveyId, ip: finalIp },
        ipAddress: finalIp,
        deviceFingerprint,
      })
      return NextResponse.json({ error: 'Connection type not allowed' }, { status: 403 })
    }
    if (fraudSettings.autoBlockVpn && ipResult.isVpn) {
      await antiFraudEngine.logFraudEvent({
        userId,
        eventType: 'vpn_detected_survey',
        severity: 'high',
        details: { surveyId, ip: finalIp },
        ipAddress: finalIp,
        deviceFingerprint,
      })
      // Flag but don't block for VPN
      isFlagged = true
      flagReason = flagReason ? `${flagReason}; vpn_detected` : 'vpn_detected'
    }
  }

  // ===== ANTI-FRAUD: Earning velocity check =====
  const velocityResult = await antiFraudEngine.checkEarningVelocity(userId)
  if (velocityResult.isSuspicious) {
    if (velocityResult.severity === 'critical') {
      await antiFraudEngine.logFraudEvent({
        userId,
        eventType: 'critical_earning_velocity',
        severity: 'critical',
        details: velocityResult,
        ipAddress: finalIp || undefined,
        deviceFingerprint,
      })
      return NextResponse.json({ error: 'Too many completions. Please try again later.' }, { status: 429 })
    }
    // For medium/high, just flag
    isFlagged = true
    flagReason = flagReason ? `${flagReason}; high_earning_velocity` : 'high_earning_velocity'
  }

  // Update or create attempt
  const updateData: Record<string, unknown> = {
    status: isFlagged ? 'flagged' : (status || 'completed'),
    reward: (isFlagged || status !== 'completed') ? 0 : (parseFloat(reward || '0') || survey.reward),
    timeSpent: timeSpentNum,
    answers: answers ? JSON.stringify(answers) : '{}',
    ipAddress: finalIp || null,
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

  // If completed (not flagged), update user balance and survey completions
  if (status === 'completed' && !isFlagged) {
    const baseReward = parseFloat(reward || '0') || survey.reward
    
    // Apply admin revenue percent
    const adminRevenuePercent = await getAdminRevenuePercent()
    const earnedReward = Math.round(baseReward * (1 - adminRevenuePercent / 100) * 1000) / 1000

    await db.user.update({
      where: { id: userId },
      data: {
        balance: { increment: earnedReward },
        totalEarned: { increment: earnedReward },
        surveysCompleted: { increment: 1 },
      },
    })

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
          baseReward,
          reward: earnedReward,
          adminRevenuePercent,
          timeSpent: timeSpentNum,
          providerTransactionId: providerTransactionId || null,
        }),
        ipAddress: finalIp || null,
        deviceFingerprint: deviceFingerprint || null,
      },
    })
  }

  // If flagged, create fraud event
  if (isFlagged) {
    await db.fraudEvent.create({
      data: {
        userId,
        eventType: flagReason || 'suspicious_activity',
        severity: 'medium',
        details: JSON.stringify({ surveyId, timeSpent: timeSpentNum, expectedTime: survey.timeMinutes * 60, completionSpeed, flagReason }),
        ipAddress: finalIp || null,
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

  return NextResponse.json({ success: true, status: isFlagged ? 'flagged' : (status || 'completed') })
}
