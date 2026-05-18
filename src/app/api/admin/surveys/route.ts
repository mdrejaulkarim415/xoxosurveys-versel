import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const wallId = searchParams.get('wallId')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (wallId && wallId !== 'all') where.wallId = wallId
    if (status === 'active') where.isActive = true
    if (status === 'inactive') where.isActive = false
    if (category && category !== 'all') where.category = category
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const [surveys, total] = await Promise.all([
      db.survey.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wall: { select: { id: true, name: true, provider: true } },
        },
      }),
      db.survey.count({ where }),
    ])

    return NextResponse.json({ surveys, total, page, limit })
  } catch (error) {
    console.error('Surveys list error:', error)
    return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      wallId, title, description, timeMinutes, reward,
      rating, available, category, country, language,
      maxCompletions, isActive, externalId, startsAt, expiresAt,
    } = body

    if (!wallId || !title) {
      return NextResponse.json({ error: 'Wall ID and title are required' }, { status: 400 })
    }

    const survey = await db.survey.create({
      data: {
        wallId,
        externalId: externalId || null,
        title,
        description: description || null,
        timeMinutes: timeMinutes ?? 10,
        reward: reward ?? 0.5,
        rating: rating ?? 5.0,
        available: available ?? 1,
        category: category || null,
        country: country || null,
        language: language || null,
        maxCompletions: maxCompletions ?? -1,
        isActive: isActive ?? true,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json(survey, { status: 201 })
  } catch (error) {
    console.error('Create survey error:', error)
    return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 })
  }
}
