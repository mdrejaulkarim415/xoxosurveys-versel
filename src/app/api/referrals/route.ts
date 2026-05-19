import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/referrals?userId=xxx
 * Returns referral earnings data for a user
 * All referral earnings are auto-credited to balance (no manual claim needed)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('userId')

    if (!userIdParam) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Find user
    const user = await db.user.findUnique({
      where: isNaN(Number(userIdParam)) ? { id: userIdParam } : { userId: parseInt(userIdParam) },
      select: {
        id: true,
        referralEarnings: true,
        friendsInvited: true,
        inviteCode: true,
        unclaimedRevenue: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get referral earning records (all are auto-credited)
    const referralRecords = await db.referralEarning.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Get referred users info
    const referredUsers = await db.user.findMany({
      where: { invitedBy: user.id },
      select: {
        id: true,
        email: true,
        surveysCompleted: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      inviteCode: user.inviteCode,
      friendsInvited: user.friendsInvited,
      referralEarnings: user.referralEarnings,
      totalReferralEarnings: user.referralEarnings,
      referralRecords,
      referredUsers,
    })
  } catch (error) {
    console.error('[Referrals] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
