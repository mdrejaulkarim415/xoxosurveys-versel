import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Force dynamic — no caching so admin toggle changes are reflected immediately
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { userId: parseInt(userId) } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'User is banned' }, { status: 403 })
    }

    const allWalls = await db.surveyWall.findMany({
      where: {
        isActive: true,
        minFraudScore: { gte: user.fraudScore },
      },
      orderBy: { priority: 'desc' },
      select: {
        id: true,
        name: true,
        provider: true,
        description: true,
        minPayout: true,
        maxPayout: true,
        apiKey: true,
        endpointUrl: true,
        config: true,
        _count: { select: { surveys: { where: { isActive: true } } } },
      },
    })

    // Filter: only show provider cards where showProviderCard is true
    // (admin can hide individual providers from the Survey Providers section)
    const walls = allWalls.filter(wall => {
      try {
        const config = JSON.parse(wall.config || '{}')
        return config.showProviderCard !== false // default: show
      } catch {
        return true
      }
    })

    const origin = new URL(request.url).origin
    const postbackUrl = `${origin}/api/surveys/callback`

    // Generate redirect URLs based on provider type
    const wallsWithUrls = walls.map(wall => {
      let redirectUrl = ''

      switch (wall.provider) {
        case 'revtoo':
          redirectUrl = `${origin}/api/surveys/revtoo-redirect?user_id=${encodeURIComponent(userId)}`
          break
        case 'cpx-research':
          redirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${wall.id}&user_id=${encodeURIComponent(userId)}`
          break
        case 'bitlabs':
          redirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${wall.id}&user_id=${encodeURIComponent(userId)}`
          break
        case 'inbrain':
          redirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${wall.id}&user_id=${encodeURIComponent(userId)}`
          break
        case 'custom':
        default:
          if (wall.endpointUrl) {
            redirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${wall.id}&user_id=${encodeURIComponent(userId)}`
          }
          break
      }

      return {
        id: wall.id,
        name: wall.name,
        provider: wall.provider,
        description: wall.description,
        minPayout: wall.minPayout,
        maxPayout: wall.maxPayout,
        surveyCount: wall._count.surveys,
        redirectUrl,
        postbackUrl,
      }
    })

    return NextResponse.json(wallsWithUrls)
  } catch (error) {
    console.error('Survey walls public list error:', error)
    return NextResponse.json({ error: 'Failed to fetch survey walls' }, { status: 500 })
  }
}
