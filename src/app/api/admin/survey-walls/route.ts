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

    const wallsWithStats = walls.map((wall) => ({
      ...wall,
      surveysAvailable: wall._count.surveys,
      completions: wall.surveys.reduce((sum, s) => sum + s.currentCompletions, 0),
      revenue: wall.surveys.reduce((sum, s) => sum + s.currentCompletions * s.reward, 0),
    }))

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
        config: config ? JSON.stringify(config) : '{}',
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
