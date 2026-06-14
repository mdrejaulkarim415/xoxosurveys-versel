import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { antiFraudEngine } from '@/lib/anti-fraud'
import { checkAndTriggerAutoReview } from '@/lib/account-review'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      surveyId,
      timeSpent,
      answers,
      deviceFingerprint,
    } = body

    // 1. Validate required fields
    if (!userId || !surveyId || timeSpent === undefined || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, surveyId, timeSpent, answers' },
        { status: 400 }
      )
    }

    // 2. Get IP from request headers
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'

    // 3. Find the user
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: 'Account is suspended' },
        { status: 403 }
      )
    }

    if (user.isUnderReview) {
      return NextResponse.json(
        { error: 'Your account is under review. Please contact support team to make it faster.' },
        { status: 403 }
      )
    }

    // 4. Find the survey
    const survey = await db.survey.findUnique({
      where: { id: surveyId },
      include: { wall: true },
    })

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      )
    }

    if (!survey.isActive) {
      return NextResponse.json(
        { error: 'Survey is no longer active' },
        { status: 400 }
      )
    }

    // 5. Check for existing attempt (prevent double submission)
    const existingAttempt = await db.surveyAttempt.findFirst({
      where: {
        userId,
        surveyId,
        status: { in: ['completed', 'started'] },
      },
    })

    if (existingAttempt?.status === 'completed') {
      return NextResponse.json(
        { error: 'Survey has already been completed' },
        { status: 400 }
      )
    }

    // 6. Anti-fraud: Check completion speed
    const speedResult = antiFraudEngine.checkCompletionSpeed({
      surveyTimeMinutes: survey.timeMinutes,
      actualTimeSeconds: timeSpent,
    })

    // 7. Anti-fraud: Analyze answer patterns
    const patternResult = antiFraudEngine.analyzeAnswerPattern(answers)

    // 8. Anti-fraud: Full risk assessment
    const riskAssessment = await antiFraudEngine.assessRisk({
      userId,
      ipAddress,
      deviceFingerprint,
      action: 'survey_complete',
      additionalData: {
        surveyTimeMinutes: survey.timeMinutes,
        actualTimeSeconds: timeSpent,
        answers,
      },
    })

    // 9. Determine if the completion should be blocked
    const fraudFlags: string[] = []
    let isFlagged = false
    let flagReason: string | null = null
    let rewardMultiplier = 1.0

    // Critical speed — block
    if (speedResult.severity === 'critical') {
      fraudFlags.push('critical_fast_completion')
      flagReason = `Completed survey in ${Math.round(timeSpent / 60)}min vs expected ${survey.timeMinutes}min (speed ratio: ${speedResult.speedRatio})`
      isFlagged = true
    }
    // High speed — flag and reduce reward
    else if (speedResult.severity === 'high') {
      fraudFlags.push('high_fast_completion')
      flagReason = `Fast completion detected (speed ratio: ${speedResult.speedRatio})`
      isFlagged = true
      rewardMultiplier = 0.5
    }
    // Medium speed — flag
    else if (speedResult.severity === 'medium') {
      fraudFlags.push('medium_fast_completion')
      rewardMultiplier = 0.75
    }

    // Answer pattern anomalies
    if (patternResult.isSuspicious) {
      fraudFlags.push(...patternResult.flags)
      if (patternResult.consistencyScore < 30) {
        isFlagged = true
        flagReason = flagReason
          ? `${flagReason}; Suspicious answer patterns (${patternResult.flags.join(', ')})`
          : `Suspicious answer patterns (${patternResult.flags.join(', ')})`
        rewardMultiplier = Math.min(rewardMultiplier, 0.3)
      } else {
        rewardMultiplier = Math.min(rewardMultiplier, 0.7)
      }
    }

    // If risk assessment says block, block it
    if (riskAssessment.shouldBlock) {
      // Create/update the attempt as flagged
      if (existingAttempt) {
        await db.surveyAttempt.update({
          where: { id: existingAttempt.id },
          data: {
            status: 'flagged',
            isFlagged: true,
            flagReason: `Blocked by risk assessment (score: ${riskAssessment.riskScore}). Flags: ${riskAssessment.flags.join(', ')}`,
            completionSpeed: speedResult.speedRatio,
            answerConsistency: patternResult.consistencyScore / 100,
            completedAt: new Date(),
          },
        })
      } else {
        await db.surveyAttempt.create({
          data: {
            userId,
            surveyId,
            status: 'flagged',
            timeSpent,
            answers: JSON.stringify(answers),
            ipAddress,
            deviceFingerprint,
            isFlagged: true,
            flagReason: `Blocked by risk assessment (score: ${riskAssessment.riskScore}). Flags: ${riskAssessment.flags.join(', ')}`,
            completionSpeed: speedResult.speedRatio,
            answerConsistency: patternResult.consistencyScore / 100,
            completedAt: new Date(),
          },
        })
      }

      // Log fraud event
      await antiFraudEngine.logFraudEvent({
        userId,
        eventType: 'blocked_survey_completion',
        severity: 'critical',
        details: {
          surveyId,
          riskScore: riskAssessment.riskScore,
          flags: riskAssessment.flags,
          speedRatio: speedResult.speedRatio,
          consistencyScore: patternResult.consistencyScore,
        },
        ipAddress,
        deviceFingerprint,
      })

      return NextResponse.json(
        {
          error: 'Survey completion blocked due to suspicious activity',
          reason: 'Your submission has been flagged for review. If you believe this is an error, please contact support.',
          riskScore: riskAssessment.riskScore,
        },
        { status: 403 }
      )
    }

    // 10. Calculate reward
    const baseReward = survey.reward
    const finalReward = Math.round(baseReward * rewardMultiplier * 1000) / 1000

    // 11. Create or update survey attempt
    const attemptData = {
      status: isFlagged ? 'flagged' as const : 'completed' as const,
      reward: isFlagged ? 0 : finalReward,
      timeSpent,
      answers: JSON.stringify(answers),
      ipAddress,
      deviceFingerprint,
      isFlagged,
      flagReason,
      completionSpeed: speedResult.speedRatio,
      answerConsistency: patternResult.consistencyScore / 100,
      completedAt: new Date(),
    }

    if (existingAttempt) {
      await db.surveyAttempt.update({
        where: { id: existingAttempt.id },
        data: attemptData,
      })
    } else {
      await db.surveyAttempt.create({
        data: {
          userId,
          surveyId,
          ...attemptData,
        },
      })
    }

    // 12. Update user balance (only if not flagged)
    if (!isFlagged) {
      await db.user.update({
        where: { id: userId },
        data: {
          balance: { increment: finalReward },
          totalEarned: { increment: finalReward },
          surveysCompleted: { increment: 1 },
        },
      })

      // Referral: If user was invited, auto-credit referrer 10% commission
      if (user.invitedBy) {
        try {
          const referrer = await db.user.findUnique({ where: { id: user.invitedBy } })
          if (referrer && !referrer.isBanned) {
            const referralAmount = Math.round(finalReward * 0.10 * 1000) / 1000
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
                  surveyReward: finalReward,
                  referralPercent: 0.10,
                  referralAmount,
                  status: 'claimed',
                  claimedAt: new Date(),
                },
              })
            }
          }
        } catch (e) {
          console.warn('[Survey Complete] Referral earning creation failed:', e)
        }
      }
    }

    // 13. Update survey completion count
    await db.survey.update({
      where: { id: surveyId },
      data: {
        currentCompletions: { increment: 1 },
      },
    })

    // 14. Log fraud events for any flags
    if (fraudFlags.length > 0) {
      await antiFraudEngine.logFraudEvent({
        userId,
        eventType: 'suspicious_survey_completion',
        severity: speedResult.severity === 'critical' || speedResult.severity === 'high' ? 'high' : 'medium',
        details: {
          surveyId,
          fraudFlags,
          speedRatio: speedResult.speedRatio,
          consistencyScore: patternResult.consistencyScore,
          rewardMultiplier,
          finalReward,
          isFlagged,
        },
        ipAddress,
        deviceFingerprint,
      })
    }

    // 15. Log activity
    const ipResult = await antiFraudEngine.checkIp(ipAddress)
    await antiFraudEngine.logActivity({
      userId,
      action: 'survey_complete',
      details: {
        surveyId,
        timeSpent,
        reward: finalReward,
        isFlagged,
        fraudFlags,
        speedRatio: speedResult.speedRatio,
        consistencyScore: patternResult.consistencyScore,
      },
      ipAddress,
      userAgent: request.headers.get('user-agent') || undefined,
      deviceFingerprint,
      country: ipResult.country,
      city: ipResult.city,
    })

    // 16. Auto-trigger account review if user earned $4 or more (always, regardless of flagged status)
    try {
      await checkAndTriggerAutoReview(userId)
    } catch (e) {
      console.warn('[Survey Complete] Auto-review check failed:', e)
    }

    // 17. Create notification for the user about the survey completion
    if (!isFlagged) {
      try {
        const offerwallLabel = survey.wall?.name || 'Internal Survey'
        await db.notification.create({
          data: {
            userId,
            type: 'survey_complete',
            title: 'Survey Completed!',
            message: `You earned $${finalReward.toFixed(3)} from ${offerwallLabel}`,
            iconType: 'reward',
            offerwall: offerwallLabel,
            rewardAmount: finalReward,
            metadata: JSON.stringify({ surveyId, reward: finalReward, timeSpent }),
          },
        })
      } catch (e) {
        console.warn('[Survey Complete] Notification creation failed:', e)
      }
    }

    return NextResponse.json({
      success: true,
      reward: finalReward,
      isFlagged,
      flags: fraudFlags,
      speedRatio: speedResult.speedRatio,
      consistencyScore: patternResult.consistencyScore,
      message: isFlagged
        ? 'Your submission has been flagged for review. Rewards will be credited after verification.'
        : `Survey completed! You earned $${finalReward.toFixed(3)}`,
    })
  } catch (error) {
    console.error('[Survey Complete] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error during survey completion' },
      { status: 500 }
    )
  }
}
