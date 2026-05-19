import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/user/earnings?userId=xxx
 * Returns earning history for a user: survey rewards, milestone claims, referral earnings
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
      select: { id: true, balance: true, totalEarned: true, surveysCompleted: true, reservedBalance: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch activity logs for earning events
    const activityLogs = await db.activityLog.findMany({
      where: {
        userId: user.id,
        action: { in: ['survey_complete', 'revtoo_survey_complete', 'provider_postback', 'milestone_claimed'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Fetch milestone claims
    const milestoneClaims = await db.milestoneClaim.findMany({
      where: {
        userId: user.id,
        status: 'claimed',
      },
      orderBy: { claimedAt: 'desc' },
    })

    // Fetch referral earnings
    const referralEarnings = await db.referralEarning.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    // Build earning entries
    type EarningEntry = {
      id: string
      type: 'survey' | 'milestone' | 'referral'
      provider: string
      providerLabel: string
      amount: number
      timeSpent: number | null
      timeMinutes: number | null
      offerId: string | null
      surveyTitle: string | null
      createdAt: string
    }

    const earnings: EarningEntry[] = []

    // Process activity logs (survey completions + provider postbacks)
    for (const log of activityLogs) {
      let details: Record<string, unknown> = {}
      try {
        details = JSON.parse(log.details || '{}')
      } catch { /* ignore */ }

      if (log.action === 'milestone_claimed') {
        // Skip - handled separately from milestoneClaims
        continue
      }

      const provider = (details.provider as string) ||
        (log.action === 'revtoo_survey_complete' ? 'revtoo' : null) ||
        (log.action === 'provider_postback' ? (details.provider as string) || 'unknown' : 'internal')

      const providerLabel = getProviderLabel(provider)
      const timeSpent = (details.timeSpent as number) || null

      earnings.push({
        id: log.id,
        type: 'survey',
        provider: provider || 'internal',
        providerLabel,
        amount: (details.reward as number) || 0,
        timeSpent,
        timeMinutes: timeSpent ? Math.round(timeSpent / 60 * 10) / 10 : null,
        offerId: (details.offerId as string) || (details.surveyId as string) || null,
        surveyTitle: null,
        createdAt: log.createdAt.toISOString(),
      })
    }

    // Process milestone claims
    for (const claim of milestoneClaims) {
      earnings.push({
        id: claim.id,
        type: 'milestone',
        provider: 'milestone',
        providerLabel: 'Milestone Reward',
        amount: claim.reward,
        timeSpent: null,
        timeMinutes: null,
        offerId: null,
        surveyTitle: `${claim.milestone} Surveys Milestone`,
        createdAt: (claim.claimedAt || claim.createdAt).toISOString(),
      })
    }

    // Process referral earnings
    for (const ref of referralEarnings) {
      earnings.push({
        id: ref.id,
        type: 'referral',
        provider: 'referral',
        providerLabel: 'Referral Commission',
        amount: ref.referralAmount,
        timeSpent: null,
        timeMinutes: null,
        offerId: null,
        surveyTitle: `From ${ref.referredEmail}`,
        createdAt: ref.createdAt.toISOString(),
      })
    }

    // Sort all by date descending
    earnings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Summary stats
    const surveyEarnings = earnings
      .filter(e => e.type === 'survey')
      .reduce((sum, e) => sum + e.amount, 0)
    const milestoneEarningsTotal = earnings
      .filter(e => e.type === 'milestone')
      .reduce((sum, e) => sum + e.amount, 0)
    const referralEarningsTotal = earnings
      .filter(e => e.type === 'referral')
      .reduce((sum, e) => sum + e.amount, 0)

    return NextResponse.json({
      balance: user.balance,
      reservedBalance: user.reservedBalance,
      totalEarned: user.totalEarned,
      surveysCompleted: user.surveysCompleted,
      summary: {
        surveyEarnings: Math.round(surveyEarnings * 1000) / 1000,
        milestoneEarnings: Math.round(milestoneEarningsTotal * 1000) / 1000,
        referralEarnings: Math.round(referralEarningsTotal * 1000) / 1000,
      },
      earnings,
    })
  } catch (error) {
    console.error('[User Earnings] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getProviderLabel(provider: string | null): string {
  if (!provider) return 'Survey'
  switch (provider) {
    case 'revtoo': return 'Revtoo'
    case 'cpx-research': return 'CPX Research'
    case 'bitlabs': return 'Bitlabs'
    case 'inbrain': return 'Inbrain'
    case 'internal': return 'Internal Survey'
    case 'unknown': return 'Survey Provider'
    default: return provider.charAt(0).toUpperCase() + provider.slice(1).replace(/-/g, ' ')
  }
}
