import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const walls = await db.surveyWall.findMany({
      orderBy: { priority: 'desc' },
      include: {
        _count: { select: { surveys: true } },
        surveys: {
          select: { currentCompletions: true, reward: true },
        },
      },
    })

    const wallsWithStats = walls.map((wall) => {
      let configParsed: Record<string, unknown> = {}
      try { configParsed = JSON.parse(wall.config || '{}') } catch { /* ignore */ }
      return {
        ...wall,
        userRevenuePercent: configParsed.userRevenuePercent || 0,
        showProviderCard: configParsed.showProviderCard !== undefined ? configParsed.showProviderCard : true,
        showInIndividualSurveys: configParsed.showInIndividualSurveys !== undefined ? configParsed.showInIndividualSurveys : true,
        surveysAvailable: wall._count.surveys,
        completions: wall.surveys.reduce((sum, s) => sum + s.currentCompletions, 0),
        revenue: wall.surveys.reduce((sum, s) => sum + s.currentCompletions * s.reward, 0),
      }
    })

    return NextResponse.json(wallsWithStats)
  } catch (error) {
    console.error('Survey walls list error:', error)
    return NextResponse.json({ error: 'Failed to fetch survey walls' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name, provider, apiKey, apiSecret, endpointUrl, isActive,
      priority, minPayout, maxPayout, description, config,
      requireVerification, blockVpn, blockProxy, minFraudScore, cooldownMinutes,
      userRevenuePercent, showProviderCard, showInIndividualSurveys,
    } = body

    if (!name || !provider) {
      return NextResponse.json({ error: 'Name and provider are required' }, { status: 400 })
    }

    const wall = await db.surveyWall.create({
      data: {
        name,
        provider,
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
        endpointUrl: endpointUrl || null,
        isActive: isActive ?? true,
        priority: priority ?? 0,
        minPayout: minPayout ?? 0.01,
        maxPayout: maxPayout ?? 5.0,
        description: description || null,
        config: config ? JSON.stringify(config) : JSON.stringify({ userRevenuePercent: userRevenuePercent || 0, showProviderCard: showProviderCard !== undefined ? showProviderCard : true, showInIndividualSurveys: showInIndividualSurveys !== undefined ? showInIndividualSurveys : true }),
        requireVerification: requireVerification ?? 0,
        blockVpn: blockVpn ?? true,
        blockProxy: blockProxy ?? true,
        minFraudScore: minFraudScore ?? 50,
        cooldownMinutes: cooldownMinutes ?? 0,
      },
    })

    return NextResponse.json(wall, { status: 201 })
  } catch (error) {
    console.error('Create survey wall error:', error)
    return NextResponse.json({ error: 'Failed to create survey wall' }, { status: 500 })
  }
}
