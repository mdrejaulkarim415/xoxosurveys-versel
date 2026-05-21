import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { antiFraudEngine } from '@/lib/anti-fraud'


/**
 * GET /api/admin/reviews?status=pending&page=1&limit=20
 * List account reviews with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    if (status !== 'all') {
      where.status = status
    }

    const [reviews, total] = await Promise.all([
      db.accountReview.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              userId: true,
              email: true,
              firstname: true,
              lastname: true,
              balance: true,
              totalEarned: true,
              surveysCompleted: true,
              fraudScore: true,
              fraudFlags: true,
              isBanned: true,
              isUnderReview: true,
              isFlagged: true,
              deviceFingerprint: true,
              lastLoginAt: true,
              lastLoginIp: true,
              loginCount: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.accountReview.count({ where }),
    ])

    // Enrich with additional data: IPs, sessions, survey attempts
    const enrichedReviews = await Promise.all(
      reviews.map(async (review) => {
        const [ips, sessions, flaggedAttempts, recentAttempts] = await Promise.all([
          db.userIp.findMany({
            where: { userId: review.userId },
            select: { ipAddress: true, country: true, city: true, isVpn: true, isProxy: true, isTor: true, isBlocked: true, firstSeen: true, lastSeen: true },
          }),
          db.session.findMany({
            where: { userId: review.userId },
            select: { ipAddress: true, deviceFingerprint: true, userAgent: true, country: true, city: true, isVpn: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          db.surveyAttempt.findMany({
            where: { userId: review.userId, isFlagged: true },
            select: { id: true, surveyId: true, timeSpent: true, completionSpeed: true, flagReason: true, completedAt: true },
            orderBy: { completedAt: 'desc' },
            take: 10,
          }),
          db.surveyAttempt.findMany({
            where: { userId: review.userId },
            select: { id: true, timeSpent: true, reward: true, completionSpeed: true, answerConsistency: true, isFlagged: true, startedAt: true, completedAt: true },
            orderBy: { completedAt: 'desc' },
            take: 20,
          }),
        ])

        return {
          ...review,
          ips,
          sessions,
          flaggedAttempts,
          recentAttempts,
          ipCount: ips.length,
          deviceCount: new Set(sessions.map(s => s.deviceFingerprint).filter(Boolean)).size,
        }
      })
    )

    return NextResponse.json({
      reviews: enrichedReviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[Admin Reviews] GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/reviews
 * Manually put a user under review OR auto-trigger review
 * Body: { userId, reason, adminId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, reason, adminId } = body

    if (!userId || !reason) {
      return NextResponse.json({ error: 'userId and reason are required' }, { status: 400 })
    }

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
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isUnderReview) {
      return NextResponse.json({ error: 'User is already under review' }, { status: 400 })
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

    // Check duplicate accounts — skip if no IP data available
    let duplicateAccounts = 0
    if (user.id) {
      try {
        const firstIp = ips[0]?.ipAddress
        if (firstIp) {
          const dupCheck = await antiFraudEngine.checkDuplicateAccount({
            ipAddress: firstIp,
            deviceFingerprint: sessions[0]?.deviceFingerprint || undefined,
            currentUserEmail: user.id,
          })
          duplicateAccounts = dupCheck.matchingUsers.length
        }
      } catch {
        // ignore duplicate check errors
      }
    }

    // Create review record and update user in transaction
    const result = await db.$transaction(async (tx) => {
      const review = await tx.accountReview.create({
        data: {
          userId: user.id,
          reason,
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
          reviewReason: reason,
          reviewTriggeredAt: new Date(),
        },
      })

      // Create notification for admin users
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
            message: `User ${user.email} (ID: #${user.userId || 'N/A'}) needs account review. Reason: ${reason}`,
            iconType: 'info',
            metadata: JSON.stringify({ reviewId: review.id, reviewedUserId: user.id }),
          },
        })
      }

      return review
    })

    return NextResponse.json({ success: true, review: result })
  } catch (error) {
    console.error('[Admin Reviews] POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/reviews
 * Update review status (release user or ban user)
 * Body: { reviewId, action: 'release' | 'ban', adminId, note? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { reviewId, action, adminId, note } = body

    if (!reviewId || !action || !adminId) {
      return NextResponse.json({ error: 'reviewId, action, and adminId are required' }, { status: 400 })
    }

    if (!['release', 'ban'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "release" or "ban"' }, { status: 400 })
    }

    const review = await db.accountReview.findUnique({
      where: { id: reviewId },
      include: { user: true },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    if (review.status !== 'pending') {
      return NextResponse.json({ error: 'Review has already been resolved' }, { status: 400 })
    }

    const now = new Date()

    const result = await db.$transaction(async (tx) => {
      // Update review record
      const updatedReview = await tx.accountReview.update({
        where: { id: reviewId },
        data: {
          status: action === 'release' ? 'released' : 'banned',
          reviewedBy: adminId,
          reviewNote: note || null,
          reviewedAt: now,
          resolvedAt: now,
        },
      })

      // Update user
      if (action === 'release') {
        await tx.user.update({
          where: { id: review.userId },
          data: {
            isUnderReview: false,
            reviewReason: null,
            reviewedAt: now,
          },
        })

        // Notify user
        await tx.notification.create({
          data: {
            userId: review.userId,
            type: 'system',
            title: 'Account Review Complete',
            message: 'Your account has been reviewed and released. You can now continue using the platform normally.',
            iconType: 'info',
          },
        })
      } else {
        // Ban user
        await tx.user.update({
          where: { id: review.userId },
          data: {
            isUnderReview: false,
            reviewReason: null,
            isBanned: true,
            banReason: note || `Banned after account review (ID: ${reviewId})`,
            reviewedAt: now,
          },
        })

        // Notify user
        await tx.notification.create({
          data: {
            userId: review.userId,
            type: 'system',
            title: 'Account Suspended',
            message: 'Your account has been suspended after review. Please contact support if you believe this is an error.',
            iconType: 'info',
          },
        })
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          adminId,
          action: action === 'release' ? 'account_review_release' : 'account_review_ban',
          target: review.userId,
          details: JSON.stringify({
            reviewId,
            action,
            note,
            userEmail: review.user.email,
          }),
        },
      })

      return updatedReview
    })

    return NextResponse.json({ success: true, review: result, action })
  } catch (error) {
    console.error('[Admin Reviews] PATCH Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
