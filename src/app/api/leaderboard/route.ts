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
    // Bangladesh timezone = UTC+6
    const BD_OFFSET = 6 * 60 * 60 * 1000 // 6 hours in ms
    const nowUtc = new Date()
    // Convert to Bangladesh time
    const nowBd = new Date(nowUtc.getTime() + BD_OFFSET)
    let startDate: Date
    let resetLabel: string

    switch (period) {
      case 'daily': {
        // Start of today in BD time at 6 AM
        // If current BD time is before 6 AM, the daily period started yesterday at 6 AM
        const bdHour = nowBd.getUTCHours()
        if (bdHour < 6) {
          // Before 6 AM BD time - daily period started yesterday at 6 AM BD
          const yesterdayBd = new Date(nowBd.getTime() - 24 * 60 * 60 * 1000)
          startDate = new Date(Date.UTC(yesterdayBd.getUTCFullYear(), yesterdayBd.getUTCMonth(), yesterdayBd.getUTCDate(), 6, 0, 0) - BD_OFFSET)
        } else {
          // After 6 AM BD time - daily period started today at 6 AM BD
          startDate = new Date(Date.UTC(nowBd.getUTCFullYear(), nowBd.getUTCMonth(), nowBd.getUTCDate(), 6, 0, 0) - BD_OFFSET)
        }
        resetLabel = '6:00 AM (BDT)'
        break
      }
      case 'weekly': {
        // Start of this week in BD time: Monday at 6 AM BD
        const bdDayOfWeek = nowBd.getUTCDay() // 0=Sun, 1=Mon, ...
        const bdHour2 = nowBd.getUTCHours()
        // Days since Monday
        let daysSinceMonday = bdDayOfWeek === 0 ? 6 : bdDayOfWeek - 1
        // If it's Monday before 6 AM BD, the week started last Monday
        if (daysSinceMonday === 0 && bdHour2 < 6) {
          daysSinceMonday = 7
        }
        const mondayBd = new Date(nowBd.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000)
        startDate = new Date(Date.UTC(mondayBd.getUTCFullYear(), mondayBd.getUTCMonth(), mondayBd.getUTCDate(), 6, 0, 0) - BD_OFFSET)
        resetLabel = 'Monday 6:00 AM (BDT)'
        break
      }
      case 'monthly':
        // Start of this month at 6 AM BD
        startDate = new Date(Date.UTC(nowBd.getUTCFullYear(), nowBd.getUTCMonth(), 1, 6, 0, 0) - BD_OFFSET)
        resetLabel = '1st 6:00 AM (BDT)'
        break
      case 'all':
      default:
        // All time - use a very old date
        startDate = new Date('2020-01-01')
        resetLabel = ''
        break
    }

    // Get all relevant activity logs for the period and aggregate in code
    // (groupBy can't sum JSON fields, so we use findMany + manual aggregation)
    // Include ALL survey/offer completion actions from all providers:
    // - survey_complete: internal survey completion
    // - provider_postback: generic callback (CPX, Bitlabs, Inbrain, etc.)
    // - revtoo_survey_complete: Revtoo-specific postback
    const SURVEY_ACTIONS = [
      'survey_complete',
      'provider_postback',
      'revtoo_survey_complete',
    ]
    const activities = await db.activityLog.findMany({
      where: {
        action: { in: SURVEY_ACTIONS },
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

    // Calculate next reset time (6 AM BD time)
    const nowUtc2 = new Date()
    const nowBd2 = new Date(nowUtc2.getTime() + BD_OFFSET)
    const bdHour3 = nowBd2.getUTCHours()

    // Next reset: today at 6 AM BD if not yet passed, otherwise tomorrow at 6 AM BD
    let nextResetBd: Date
    if (bdHour3 < 6) {
      // Before 6 AM BD - reset is today at 6 AM BD
      nextResetBd = new Date(Date.UTC(nowBd2.getUTCFullYear(), nowBd2.getUTCMonth(), nowBd2.getUTCDate(), 6, 0, 0))
    } else {
      // After 6 AM BD - reset is tomorrow at 6 AM BD
      const tomorrowBd = new Date(nowBd2.getTime() + 24 * 60 * 60 * 1000)
      nextResetBd = new Date(Date.UTC(tomorrowBd.getUTCFullYear(), tomorrowBd.getUTCMonth(), tomorrowBd.getUTCDate(), 6, 0, 0))
    }
    // Convert back to UTC
    const nextResetUtc = new Date(nextResetBd.getTime() - BD_OFFSET)
    const msUntilReset = nextResetUtc.getTime() - nowUtc2.getTime()
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
        resetTime: period === 'daily' ? '6:00 AM (BDT)' : period === 'weekly' ? 'Monday 6:00 AM (BDT)' : '6:00 AM (BDT)',
      },
      totalParticipants: earningsMap.size,
    })
  } catch (error) {
    console.error('[Leaderboard] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
