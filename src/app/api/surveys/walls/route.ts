import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    const walls = await db.surveyWall.findMany({
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

    const origin = new URL(request.url).origin
    const postbackUrl = `${origin}/api/surveys/callback`

    // Generate redirect URLs based on provider type
    // Filter out walls where showProviderCard is false
    const wallsWithUrls = walls
      .map(wall => {
        // Check if provider card should be shown (default: true)
        let showProviderCard = true
        try {
          const config = JSON.parse(wall.config || '{}')
          showProviderCard = config.showProviderCard !== false
        } catch {
          // Default to showing
        }

        let redirectUrl = ''

        switch (wall.provider) {
          case 'revtoo':
            redirectUrl = `${origin}/api/surveys/revtoo-redirect?user_id=${userId}`
            break
          case 'cpx-research':
            if (wall.endpointUrl && wall.apiKey) {
              redirectUrl = `${wall.endpointUrl}?api_key=${wall.apiKey}&user_id=${userId}`
            } else if (wall.endpointUrl) {
              redirectUrl = `${wall.endpointUrl}?user_id=${userId}`
            }
            break
          case 'bitlabs':
            if (wall.endpointUrl && wall.apiKey) {
              redirectUrl = `${wall.endpointUrl}?api_key=${wall.apiKey}&uid=${userId}`
            } else if (wall.endpointUrl) {
              redirectUrl = `${wall.endpointUrl}?uid=${userId}`
            }
            break
          case 'inbrain':
            if (wall.endpointUrl && wall.apiKey) {
              redirectUrl = `${wall.endpointUrl}?appId=${wall.apiKey}&userId=${userId}`
            } else if (wall.endpointUrl) {
              redirectUrl = `${wall.endpointUrl}?userId=${userId}`
            }
            break
          case 'custom':
          default:
            if (wall.endpointUrl) {
              const sep = wall.endpointUrl.includes('?') ? '&' : '?'
              redirectUrl = `${wall.endpointUrl}${sep}user_id=${userId}`
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
          showProviderCard,
        }
      })
      .filter(wall => wall.showProviderCard !== false) // Hide walls where showProviderCard=false

    return NextResponse.json(wallsWithUrls)
  } catch (error) {
    console.error('Survey walls public list error:', error)
    return NextResponse.json({ error: 'Failed to fetch survey walls' }, { status: 500 })
  }
}
