import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RankedUser {
  rank: number
  userId: string
  numericUserId: number
  email: string
  firstname: string | null
  lastname: string | null
  earnings: number
  offers: number
  totalEarned: number
}

/**
 * GET /api/leaderboard?period=daily|weekly|monthly|all&userId=xxx
 * Fetch leaderboard rankings based on time period
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'daily'
    const userId = searchParams.get('userId')

    // Calculate the start date based on period
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'daily':
        // Start of today
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'weekly': {
        // Start of this week (Monday)
        const dayOfWeek = now.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
        break
      }
      case 'monthly':
        // Start of this month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'all':
      default:
        // All time - use a very old date
        startDate = new Date('2020-01-01')
        break
    }

    // Get all relevant activity logs for the period and aggregate in code
    // (groupBy can't sum JSON fields, so we use findMany + manual aggregation)
    const activities = await db.activityLog.findMany({
      where: {
        action: { in: ['survey_complete', 'provider_postback'] },
        createdAt: { gte: startDate },
      },
      select: {
        userId: true,
        details: true,
        action: true,
      },
    })

    // Aggregate earnings per user
    const earningsMap = new Map<string, { earnings: number; offers: number }>()

    for (const activity of activities) {
      const uid = activity.userId
      let reward = 0

      try {
        const details = typeof activity.details === 'string'
          ? JSON.parse(activity.details)
          : activity.details
        reward = parseFloat(details?.reward || details?.payout || '0') || 0
      } catch {
        reward = 0
      }

      const existing = earningsMap.get(uid) || { earnings: 0, offers: 0 }
      existing.earnings += reward
      existing.offers += 1
      earningsMap.set(uid, existing)
    }

    // Sort by earnings descending
    const sortedUsers = Array.from(earningsMap.entries())
      .map(([uid, data]) => ({ userId: uid, ...data }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 50)

    // Get user details for ranked users
    const rankedUsers: RankedUser[] = []
    for (let i = 0; i < sortedUsers.length; i++) {
      const entry = sortedUsers[i]
      try {
        const user = await db.user.findUnique({
          where: { id: entry.userId },
          select: {
            id: true,
            userId: true,
            email: true,
            firstname: true,
            lastname: true,
            surveysCompleted: true,
            totalEarned: true,
            isBanned: true,
          },
        })

        if (user && !user.isBanned) {
          rankedUsers.push({
            rank: i + 1,
            userId: user.id,
            numericUserId: user.userId,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            earnings: Math.round(entry.earnings * 1000) / 1000,
            offers: entry.offers,
            totalEarned: user.totalEarned,
          })
        }
      } catch {
        // Skip this user if lookup fails
      }
    }

    // Get current user's ranking if provided
    let myRank: number | null = null
    let myEarnings = 0
    let myOffers = 0

    if (userId) {
      // Find user by cuid or numeric ID
      const user = await db.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { userId: parseInt(userId) || -1 },
          ],
        },
        select: { id: true },
      })

      if (user) {
        const myData = earningsMap.get(user.id)
        if (myData) {
          myEarnings = Math.round(myData.earnings * 1000) / 1000
          myOffers = myData.offers
          // Find rank
          const rankIndex = sortedUsers.findIndex(e => e.userId === user.id)
          myRank = rankIndex >= 0 ? rankIndex + 1 : null
        } else {
          // Not found in activity logs - no earnings in this period
          myRank = null
          myEarnings = 0
          myOffers = 0
        }
      }
    }

    // Calculate next reset time
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const msUntilReset = tomorrow.getTime() - now.getTime()
    const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60))
    const minutesUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60))
    const secondsUntilReset = Math.floor((msUntilReset % (1000 * 60)) / 1000)

    return NextResponse.json({
      period,
      rankings: rankedUsers,
      myRank,
      myEarnings,
      myOffers,
      nextReset: {
        hours: hoursUntilReset,
        minutes: minutesUntilReset,
        seconds: secondsUntilReset,
        resetTime: '12:00 AM',
      },
      totalParticipants: earningsMap.size,
    })
  } catch (error) {
    console.error('[Leaderboard] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
