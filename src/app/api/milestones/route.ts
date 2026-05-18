import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Milestone definitions: surveys completed => reward amount
const MILESTONES = [
  { count: 10, reward: 0.25 },
  { count: 15, reward: 0.50 },
  { count: 25, reward: 1.00 },
  { count: 100, reward: 2.50 },
]

/**
 * GET /api/milestones?userId=xxx
 * Returns milestone progress and claim status for a user
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
      select: { id: true, surveysCompleted: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get existing claims
    const claims = await db.milestoneClaim.findMany({
      where: { userId: user.id },
    })

    const claimMap = new Map(claims.map(c => [c.milestone, c]))

    // Build milestone progress
    const milestones = MILESTONES.map(m => {
      const claim = claimMap.get(m.count)
      const progress = Math.min(user.surveysCompleted, m.count)
      const isCompleted = user.surveysCompleted >= m.count
      const isClaimed = claim?.status === 'claimed'

      return {
        milestone: m.count,
        reward: m.reward,
        progress,
        isCompleted,
        isClaimed,
        canClaim: isCompleted && !isClaimed,
        claimedAt: claim?.claimedAt || null,
      }
    })

    return NextResponse.json({
      surveysCompleted: user.surveysCompleted,
      milestones,
      totalClaimable: milestones
        .filter(m => m.canClaim)
        .reduce((sum, m) => sum + m.reward, 0),
    })
  } catch (error) {
    console.error('[Milestones] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
