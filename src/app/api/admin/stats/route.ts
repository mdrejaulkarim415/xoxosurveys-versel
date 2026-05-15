import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // ============ Core Stats ============
    const totalUsers = await db.user.count()
    const activeUsers = await db.user.count({ where: { isActive: true, isBanned: false } })
    const fraudAlerts = await db.fraudEvent.count({ where: { isResolved: false } })
    const pendingCashoutsAgg = await db.cashout.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true },
    })
    const totalRevenueAgg = await db.surveyAttempt.aggregate({
      where: { status: 'completed' },
      _sum: { reward: true },
    })
    const totalRevenue = totalRevenueAgg._sum.reward || 0
    const pendingCashouts = pendingCashoutsAgg._sum.amount || 0

    // ============ Growth Calculations (current month vs previous month) ============
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = thisMonthStart

    // Users growth
    const usersThisMonth = await db.user.count({ where: { createdAt: { gte: thisMonthStart } } })
    const usersLastMonth = await db.user.count({
      where: { createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
    })
    const usersGrowth = usersLastMonth > 0 ? Number((((usersThisMonth - usersLastMonth) / usersLastMonth) * 100).toFixed(1)) : usersThisMonth > 0 ? 100 : 0

    // Revenue growth
    const revenueThisMonth = await db.surveyAttempt.aggregate({
      where: { status: 'completed', completedAt: { gte: thisMonthStart } },
      _sum: { reward: true },
    })
    const revenueLastMonth = await db.surveyAttempt.aggregate({
      where: { status: 'completed', completedAt: { gte: lastMonthStart, lt: lastMonthEnd } },
      _sum: { reward: true },
    })
    const revThis = revenueThisMonth._sum.reward || 0
    const revLast = revenueLastMonth._sum.reward || 0
    const revenueGrowth = revLast > 0 ? Number((((revThis - revLast) / revLast) * 100).toFixed(1)) : revThis > 0 ? 100 : 0

    // Active users growth
    const activeThisMonth = await db.user.count({
      where: { isActive: true, isBanned: false, lastLoginAt: { gte: thisMonthStart } },
    })
    const activeLastMonth = await db.user.count({
      where: { isActive: true, isBanned: false, lastLoginAt: { gte: lastMonthStart, lt: lastMonthEnd } },
    })
    const activeUsersGrowth = activeLastMonth > 0 ? Number((((activeThisMonth - activeLastMonth) / activeLastMonth) * 100).toFixed(1)) : activeThisMonth > 0 ? 100 : 0

    // Pending cashouts growth (count-based comparison)
    const pendingCashoutsThisMonth = await db.cashout.count({
      where: { status: 'pending', createdAt: { gte: thisMonthStart } },
    })
    const pendingCashoutsLastMonth = await db.cashout.count({
      where: { status: 'pending', createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
    })
    const pendingCashoutsGrowth = pendingCashoutsLastMonth > 0
      ? Number((((pendingCashoutsThisMonth - pendingCashoutsLastMonth) / pendingCashoutsLastMonth) * 100).toFixed(1))
      : pendingCashoutsThisMonth > 0 ? 100 : 0

    // Fraud alerts growth
    const fraudThisMonth = await db.fraudEvent.count({ where: { createdAt: { gte: thisMonthStart } } })
    const fraudLastMonth = await db.fraudEvent.count({ where: { createdAt: { gte: lastMonthStart, lt: lastMonthEnd } } })
    const fraudGrowth = fraudLastMonth > 0 ? Number((((fraudThisMonth - fraudLastMonth) / fraudLastMonth) * 100).toFixed(1)) : fraudThisMonth > 0 ? 100 : 0

    // Chargeback growth
    const chargebacksThisMonth = await db.cashout.count({
      where: { isChargeback: true, chargebackAt: { gte: thisMonthStart } },
    })
    const chargebacksLastMonth = await db.cashout.count({
      where: { isChargeback: true, chargebackAt: { gte: lastMonthStart, lt: lastMonthEnd } },
    })
    const chargebackGrowth = chargebacksLastMonth > 0
      ? Number((((chargebacksThisMonth - chargebacksLastMonth) / chargebacksLastMonth) * 100).toFixed(1))
      : chargebacksThisMonth > 0 ? 100 : 0

    // ============ Chart Data: Monthly user growth, revenue, survey completions ============
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const userGrowth: { name: string; users: number; revenue: number; surveys: number }[] = []

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const label = monthNames[monthDate.getMonth()]

      const monthUsers = await db.user.count({
        where: { createdAt: { gte: monthDate, lt: monthEnd } },
      })

      const monthRevenue = await db.surveyAttempt.aggregate({
        where: { status: 'completed', completedAt: { gte: monthDate, lt: monthEnd } },
        _sum: { reward: true },
      })

      const monthSurveys = await db.surveyAttempt.count({
        where: { status: 'completed', completedAt: { gte: monthDate, lt: monthEnd } },
      })

      userGrowth.push({
        name: label,
        users: monthUsers,
        revenue: monthRevenue._sum.reward || 0,
        surveys: monthSurveys,
      })
    }

    // ============ Fraud Distribution ============
    const fraudEvents = await db.fraudEvent.findMany({
      where: { isResolved: false },
      select: { eventType: true },
    })

    const fraudCounts: Record<string, number> = {}
    for (const fe of fraudEvents) {
      const key = fe.eventType
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      fraudCounts[key] = (fraudCounts[key] || 0) + 1
    }

    const fraudColors: Record<string, string> = {
      'Vpn Detected': '#2DD9B6',
      'Fast Completion': '#22B9CF',
      'Duplicate Ip': '#F59E0B',
      'Bot Detected': '#EF4444',
      'Multiple Accounts': '#F97316',
      'Proxy Detected': '#8B5CF6',
      'Device Mismatch': '#EC4899',
      'Suspicious Location': '#14B8A6',
      'Impossible Pattern': '#6366F1',
      'Answer Inconsistency': '#A855F7',
    }

    const totalFraud = Object.values(fraudCounts).reduce((s, v) => s + v, 0)
    const defaultColors = ['#2DD9B6', '#22B9CF', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#EC4899', '#14B8A6', '#6366F1', '#A855F7']

    const fraudDistribution = totalFraud > 0
      ? Object.entries(fraudCounts).map(([name, count], idx) => ({
          name,
          value: Math.round((count / totalFraud) * 100),
          color: fraudColors[name] || defaultColors[idx % defaultColors.length],
        }))
      : [
          { name: 'No Fraud Events', value: 100, color: '#D1D5DB' },
        ]

    // ============ Recent Fraud Alerts ============
    const recentFraudEvents = await db.fraudEvent.findMany({
      where: { isResolved: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        eventType: true,
        severity: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    })

    const recentAlerts = recentFraudEvents.map((fe) => ({
      id: fe.id,
      type: fe.eventType
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      user: fe.user?.email || 'Unknown',
      severity: fe.severity,
      time: formatTimeAgo(fe.createdAt),
    }))

    // ============ Pending Cashouts List ============
    const pendingCashoutsData = await db.cashout.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        giftCardType: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    })

    const pendingCashoutsList = pendingCashoutsData.map((co) => ({
      id: co.id,
      user: co.user.email,
      amount: co.amount,
      method: co.giftCardType.charAt(0).toUpperCase() + co.giftCardType.slice(1),
      time: formatTimeAgo(co.createdAt),
    }))

    // ============ Recent Chargebacks ============
    const chargebacksData = await db.cashout.findMany({
      where: { isChargeback: true },
      orderBy: { chargebackAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        giftCardType: true,
        chargebackReason: true,
        chargebackAt: true,
        user: { select: { email: true } },
      },
    })

    const recentChargebacks = chargebacksData.map((cb) => ({
      id: cb.id,
      user: cb.user.email,
      amount: cb.chargebackAmount || cb.amount,
      method: cb.giftCardType.charAt(0).toUpperCase() + cb.giftCardType.slice(1),
      reason: cb.chargebackReason || 'No reason provided',
      time: formatTimeAgo(cb.chargebackAt || cb.createdAt),
    }))

    // For chargeback count on stat card - use the count
    const chargebackCount = await db.cashout.count({ where: { isChargeback: true } })

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalRevenue,
      pendingCashouts,
      fraudAlerts,
      usersGrowth,
      revenueGrowth,
      activeUsersGrowth,
      pendingCashoutsGrowth,
      fraudGrowth,
      chargebackGrowth,
      chargebackCount,
      userGrowth,
      fraudDistribution,
      recentAlerts,
      pendingCashoutsList,
      recentChargebacks,
    })
  } catch (error) {
    console.error('Stats error:', error)
    // Return structured fallback with empty data so the UI doesn't crash
    return NextResponse.json({
      totalUsers: 0,
      activeUsers: 0,
      totalRevenue: 0,
      pendingCashouts: 0,
      fraudAlerts: 0,
      usersGrowth: 0,
      revenueGrowth: 0,
      activeUsersGrowth: 0,
      pendingCashoutsGrowth: 0,
      fraudGrowth: 0,
      chargebackGrowth: 0,
      chargebackCount: 0,
      userGrowth: [],
      fraudDistribution: [{ name: 'No Data', value: 100, color: '#D1D5DB' }],
      recentAlerts: [],
      pendingCashoutsList: [],
      recentChargebacks: [],
    })
  }
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Unknown'
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
}
