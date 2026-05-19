import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const wallId = searchParams.get('wallId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { userId: parseInt(userId) } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.json({ error: 'User is banned' }, { status: 403 })
    }

    const where: Record<string, unknown> = {
      isActive: true,
      wall: { isActive: true, minFraudScore: { gte: user.fraudScore } },
    }

    if (wallId) where.wallId = wallId

    const surveys = await db.survey.findMany({
      where,
      orderBy: { reward: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        timeMinutes: true,
        reward: true,
        rating: true,
        reviews: true,
        available: true,
        category: true,
        country: true,
        language: true,
        wall: {
          select: {
            id: true,
            name: true,
            provider: true,
          },
        },
      },
    })

    const origin = new URL(request.url).origin

    // Generate redirect URL for each survey based on its wall provider
    const surveysWithUrls = surveys.map(survey => {
      let redirectUrl = ''
      const wall = survey.wall

      switch (wall.provider) {
        case 'revtoo':
          redirectUrl = `${origin}/api/surveys/revtoo-redirect?user_id=${encodeURIComponent(userId)}`
          break
        case 'cpx-research':
        case 'bitlabs':
        case 'inbrain':
          redirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${wall.id}&user_id=${encodeURIComponent(userId)}`
          break
        case 'custom':
        default:
          redirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${wall.id}&user_id=${encodeURIComponent(userId)}`
          break
      }

      return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        timeMinutes: survey.timeMinutes,
        reward: survey.reward,
        rating: survey.rating,
        reviews: survey.reviews,
        available: survey.available,
        category: survey.category,
        country: survey.country,
        language: survey.language,
        wall: {
          id: wall.id,
          name: wall.name,
          provider: wall.provider,
        },
        redirectUrl,
      }
    })

    return NextResponse.json(surveysWithUrls)
  } catch (error) {
    console.error('Available surveys error:', error)
    return NextResponse.json({ error: 'Failed to fetch available surveys' }, { status: 500 })
  }
}
