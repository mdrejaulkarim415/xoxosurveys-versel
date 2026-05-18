import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MILESTONES: Record<number, number> = {
  10: 0.25,
  15: 0.50,
  25: 1.00,
  100: 2.50,
}

/**
 * POST /api/milestones/claim
 * Claim a milestone reward
 * Body: { userId, milestone }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, milestone } = body

    if (!userId || !milestone) {
      return NextResponse.json({ error: 'userId and milestone are required' }, { status: 400 })
    }

    const reward = MILESTONES[milestone]
    if (reward === undefined) {
      return NextResponse.json({ error: 'Invalid milestone' }, { status: 400 })
    }

    // Find user
    const user = await db.user.findUnique({
      where: isNaN(Number(userId)) ? { id: userId } : { userId: parseInt(userId) },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has completed enough surveys
    if (user.surveysCompleted < milestone) {
      return NextResponse.json({ error: `You need to complete ${milestone} surveys first` }, { status: 400 })
    }

    // Check if already claimed (upsert with unique constraint)
    const existing = await db.milestoneClaim.findUnique({
      where: {
        userId_milestone: {
          userId: user.id,
          milestone,
        },
      },
    })

    if (existing && existing.status === 'claimed') {
      return NextResponse.json({ error: 'Milestone already claimed' }, { status: 400 })
    }

    // Create or update claim and add reward to balance
    if (existing) {
      await db.milestoneClaim.update({
        where: { id: existing.id },
        data: {
          status: 'claimed',
          claimedAt: new Date(),
        },
      })
    } else {
      await db.milestoneClaim.create({
        data: {
          userId: user.id,
          milestone,
          reward,
          status: 'claimed',
          claimedAt: new Date(),
        },
      })
    }

    // Add reward to user balance
    await db.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: reward },
        totalEarned: { increment: reward },
      },
    })

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: 'milestone_claimed',
          details: JSON.stringify({ milestone, reward }),
        },
      })
    } catch (e) {
      console.warn('[Milestone Claim] Activity log failed:', e)
    }

    return NextResponse.json({
      success: true,
      milestone,
      reward,
      message: `You claimed $${reward.toFixed(2)} for completing ${milestone} surveys!`,
    })
  } catch (error) {
    console.error('[Milestone Claim] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
