import { db } from '@/lib/db'
import { antiFraudEngine } from '@/lib/anti-fraud'

/**
 * Check if a user's totalEarned has reached $4 and auto-trigger account review.
 * This should be called after any earning event (survey completion, postback, etc.)
 * 
 * Returns true if review was triggered, false otherwise.
 */
export async function checkAndTriggerAutoReview(userId: string): Promise<{ triggered: boolean; reviewId?: string }> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        totalEarned: true,
        surveysCompleted: true,
        fraudScore: true,
        isBanned: true,
        isUnderReview: true,
        userId: true,
      },
    })

    if (!user || user.isBanned || user.isUnderReview) {
      return { triggered: false }
    }

    // Check if user has earned $4 or more
    if (user.totalEarned < 4.0) {
      return { triggered: false }
    }

    // Check if there's already been ANY auto_4dollar review for this user (pending, approved, or rejected)
    // Auto review only triggers ONCE per account - the first time they reach $4+
    const existingReview = await db.accountReview.findFirst({
      where: {
        userId: user.id,
        reason: 'auto_4dollar',
      },
    })

    if (existingReview) {
      return { triggered: false }
    }

    // Gather review snapshot data
    const [ips, sessions, flaggedAttempts] = await Promise.all([
      db.userIp.findMany({ where: { userId: user.id } }),
      db.session.findMany({ where: { userId: user.id } }),
      db.surveyAttempt.findMany({ where: { userId: user.id, isFlagged: true } }),
    ])

    // Calculate average completion speed
    const completedAttempts = await db.surveyAttempt.findMany({
      where: { userId: user.id, completionSpeed: { not: null } },
      select: { completionSpeed: true },
    })
    const avgCompletionSpeed = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + (a.completionSpeed || 0), 0) / completedAttempts.length
      : 0

    // Check VPN detection
    const vpnIps = ips.filter(ip => ip.isVpn || ip.isProxy || ip.isTor)
    const vpnDetected = vpnIps.length > 0

    // Check duplicate accounts
    let duplicateAccounts = 0
    try {
      const dupCheck = await antiFraudEngine.checkDuplicateAccount({
        ipAddress: ips[0]?.ipAddress || '',
        deviceFingerprint: sessions[0]?.deviceFingerprint || undefined,
        currentUserEmail: user.id,
      })
      duplicateAccounts = dupCheck.matchingUsers.length
    } catch {
      // ignore
    }

    // Create review and update user in transaction
    const result = await db.$transaction(async (tx) => {
      const review = await tx.accountReview.create({
        data: {
          userId: user.id,
          reason: 'auto_4dollar',
          status: 'pending',
          totalEarned: user.totalEarned,
          surveysCompleted: user.surveysCompleted,
          fraudScore: user.fraudScore,
          ipCount: ips.length,
          deviceCount: new Set(sessions.map(s => s.deviceFingerprint).filter(Boolean)).size,
          avgCompletionSpeed,
          flaggedAttempts: flaggedAttempts.length,
          vpnDetected,
          duplicateAccounts,
        },
      })

      await tx.user.update({
        where: { id: user.id },
        data: {
          isUnderReview: true,
          reviewReason: 'auto_4dollar',
          reviewTriggeredAt: new Date(),
        },
      })

      // Notify admin users
      const admins = await tx.user.findMany({
        where: { role: 'admin' },
        select: { id: true },
      })

      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            type: 'system',
            title: 'Account Review Required',
            message: `User ${user.email} (ID: #${user.userId}) has earned $${user.totalEarned.toFixed(2)} and needs account review.`,
            iconType: 'info',
            metadata: JSON.stringify({ reviewId: review.id, reviewedUserId: user.id }),
          },
        })
      }

      // Notify user
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'system',
          title: 'Account Under Review',
          message: 'Your account is under review. Please contact our support team for faster processing.',
          iconType: 'info',
        },
      })

      return review
    })

    console.log(`[Auto Review] Triggered for user ${user.email} (earned $${user.totalEarned.toFixed(2)})`)
    return { triggered: true, reviewId: result.id }
  } catch (error) {
    console.error('[Auto Review] Error:', error)
    return { triggered: false }
  }
}
