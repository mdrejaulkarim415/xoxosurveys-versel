import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { antiFraudEngine } from '@/lib/anti-fraud'

/**
 * POST /api/cashout - Create a new cashout request
 * Body: { userId, giftCardType, amount, paymentDetail }
 * 
 * Anti-fraud features:
 * - Fraud score threshold check
 * - Rate limiting (max cashouts per day)
 * - VPN/proxy detection
 * - Earning velocity check
 * - Auto-flag suspicious cashouts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, giftCardType, amount, paymentDetail } = body

    // Validate required fields
    if (!userId || !giftCardType || !amount) {
      return NextResponse.json(
        { error: 'userId, giftCardType, and amount are required' },
        { status: 400 }
      )
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Get IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : null

    // Find user by cuid
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        balance: true, 
        emailVerified: true, 
        isBanned: true, 
        email: true,
        fraudScore: true,
        isFlagged: true,
        isVpnBlocked: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ===== ANTI-FRAUD: Check if banned =====
    if (user.isBanned) {
      return NextResponse.json({ error: 'Account is suspended' }, { status: 403 })
    }

    // ===== ANTI-FRAUD: Check if email verified =====
    if (!user.emailVerified) {
      return NextResponse.json({ error: 'Email must be verified to cash out' }, { status: 403 })
    }

    // ===== ANTI-FRAUD: Check balance =====
    if (user.balance < amountNum) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    // ===== ANTI-FRAUD: Fraud score check =====
    // Get fraud settings
    let fraudScoreBlockThreshold = 50
    let maxCashoutsPerDay = 3
    try {
      const settings = await db.adminSettings.findMany({
        where: { key: { in: ['fraudScoreBlockThreshold', 'maxCashoutsPerDay'] } },
      })
      const map: Record<string, string> = {}
      settings.forEach(s => { map[s.key] = s.value })
      fraudScoreBlockThreshold = parseFloat(map.fraudScoreBlockThreshold || '50') || 50
      maxCashoutsPerDay = parseInt(map.maxCashoutsPerDay || '3') || 3
    } catch {}

    if (user.fraudScore >= fraudScoreBlockThreshold) {
      // Log fraud event
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'cashout_blocked_fraud_score',
        severity: 'high',
        details: { 
          giftCardType, 
          amount: amountNum, 
          fraudScore: user.fraudScore,
          threshold: fraudScoreBlockThreshold,
        },
        ipAddress: ipAddress || undefined,
      })
      return NextResponse.json(
        { error: 'Cashout request blocked due to account restrictions. Please contact support.' },
        { status: 403 }
      )
    }

    // ===== ANTI-FRAUD: Rate limiting =====
    const recentCashouts = await db.cashout.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    if (recentCashouts.length >= maxCashoutsPerDay) {
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'frequent_cashout_attempt',
        severity: 'medium',
        details: { 
          giftCardType, 
          amount: amountNum, 
          recentCashouts: recentCashouts.length,
          maxPerDay: maxCashoutsPerDay,
        },
        ipAddress: ipAddress || undefined,
      })
      return NextResponse.json(
        { error: `Maximum ${maxCashoutsPerDay} cashout requests per day. Please try again tomorrow.` },
        { status: 429 }
      )
    }

    // ===== ANTI-FRAUD: VPN/proxy check =====
    let shouldFlagCashout = false
    let flagReason: string | null = null

    if (ipAddress) {
      const ipResult = await antiFraudEngine.checkIp(ipAddress)
      
      if (ipResult.isTor) {
        await antiFraudEngine.logFraudEvent({
          userId: user.id,
          eventType: 'tor_detected_cashout',
          severity: 'critical',
          details: { giftCardType, amount: amountNum, ip: ipAddress },
          ipAddress,
        })
        return NextResponse.json(
          { error: 'Cashout not allowed from this connection. Please use a regular internet connection.' },
          { status: 403 }
        )
      }

      if (ipResult.isVpn || ipResult.isProxy) {
        shouldFlagCashout = true
        flagReason = ipResult.isVpn ? 'VPN detected on cashout' : 'Proxy detected on cashout'
        await antiFraudEngine.logFraudEvent({
          userId: user.id,
          eventType: ipResult.isVpn ? 'vpn_detected_cashout' : 'proxy_detected_cashout',
          severity: 'high',
          details: { giftCardType, amount: amountNum, ip: ipAddress, riskScore: ipResult.riskScore },
          ipAddress,
        })
      }
    }

    // ===== ANTI-FRAUD: Earning velocity check =====
    const velocityResult = await antiFraudEngine.checkEarningVelocity(user.id)
    if (velocityResult.isSuspicious) {
      shouldFlagCashout = true
      flagReason = flagReason 
        ? `${flagReason}; suspicious earning velocity ($${velocityResult.earnedLast1h.toFixed(2)} in 1h)` 
        : `Suspicious earning velocity ($${velocityResult.earnedLast1h.toFixed(2)} in 1h)`
      
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'suspicious_earning_velocity_cashout',
        severity: velocityResult.severity === 'critical' ? 'critical' : 'high',
        details: { 
          giftCardType, 
          amount: amountNum,
          earnedLast1h: velocityResult.earnedLast1h,
          earnedLast24h: velocityResult.earnedLast24h,
          completionsLast1h: velocityResult.completionsLast1h,
          completionsLast24h: velocityResult.completionsLast24h,
        },
        ipAddress: ipAddress || undefined,
      })

      // If critical velocity, block the cashout entirely
      if (velocityResult.severity === 'critical') {
        return NextResponse.json(
          { error: 'Cashout temporarily restricted. Please contact support.' },
          { status: 403 }
        )
      }
    }

    // ===== ANTI-FRAUD: Check if flagged user =====
    if (user.isFlagged && !shouldFlagCashout) {
      shouldFlagCashout = true
      flagReason = 'User has existing fraud flags'
    }

    // ===== ANTI-FRAUD: Referral fraud check =====
    const referralFraud = await antiFraudEngine.checkReferralFraud(user.id)
    if (referralFraud.isFraud) {
      shouldFlagCashout = true
      flagReason = flagReason
        ? `${flagReason}; referral fraud suspected (${referralFraud.suspiciousReferrals.length} suspicious referrals)`
        : `Referral fraud suspected (${referralFraud.suspiciousReferrals.length} suspicious referrals)`
      
      await antiFraudEngine.logFraudEvent({
        userId: user.id,
        eventType: 'referral_fraud_cashout',
        severity: 'high',
        details: { 
          giftCardType, 
          amount: amountNum,
          suspiciousReferrals: referralFraud.suspiciousReferrals,
          confidence: referralFraud.confidence,
        },
        ipAddress: ipAddress || undefined,
      })
    }

    // Min/max amounts per gift card type
    const limits: Record<string, { min: number; max: number }> = {
      'binance': { min: 5, max: 100 },
      'litecoin': { min: 5, max: 100 },
      'paypal': { min: 5, max: 100 },
      'amazon': { min: 5, max: 50 },
      'google-play': { min: 10, max: 50 },
    }

    const limit = limits[giftCardType]
    if (limit && (amountNum < limit.min || amountNum > limit.max)) {
      return NextResponse.json(
        { error: `Amount must be between $${limit.min} and $${limit.max} for ${giftCardType}` },
        { status: 400 }
      )
    }

    // Validate payment detail for crypto/PayPal
    if (['binance', 'litecoin', 'paypal'].includes(giftCardType) && !paymentDetail?.trim()) {
      return NextResponse.json(
        { error: `Payment detail is required for ${giftCardType}` },
        { status: 400 }
      )
    }

    // Create cashout and deduct balance in a transaction
    const cashout = await db.$transaction(async (tx) => {
      // Deduct balance
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amountNum } },
        select: { balance: true },
      })

      // Create cashout record
      const newCashout = await tx.cashout.create({
        data: {
          userId: user.id,
          giftCardType,
          amount: amountNum,
          paymentDetail: paymentDetail?.trim() || null,
          ipAddress,
          status: shouldFlagCashout ? 'flagged' : 'pending',
          isFlagged: shouldFlagCashout,
          flagReason: shouldFlagCashout ? flagReason : null,
        },
      })

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'cashout_request',
          details: JSON.stringify({
            cashoutId: newCashout.id,
            giftCardType,
            amount: amountNum,
            paymentDetail: paymentDetail?.trim() || null,
            isFlagged: shouldFlagCashout,
            flagReason: shouldFlagCashout ? flagReason : null,
          }),
          ipAddress,
        },
      })

      return { ...newCashout, newBalance: updatedUser.balance }
    })

    return NextResponse.json({
      success: true,
      cashout: {
        id: cashout.id,
        giftCardType: cashout.giftCardType,
        amount: cashout.amount,
        paymentDetail: cashout.paymentDetail,
        status: cashout.status,
        isFlagged: cashout.isFlagged,
        createdAt: cashout.createdAt,
      },
      newBalance: cashout.newBalance,
      message: shouldFlagCashout 
        ? 'Your cashout request has been submitted and is under review. This may take longer than usual.'
        : undefined,
    })
  } catch (error: any) {
    console.error('[Cashout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process cashout request' },
      { status: 500 }
    )
  }
}
