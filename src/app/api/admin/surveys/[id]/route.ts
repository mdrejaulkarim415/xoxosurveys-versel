import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const survey = await db.survey.findUnique({
      where: { id },
      include: {
        wall: { select: { id: true, name: true, provider: true } },
        attempts: {
          take: 50,
          orderBy: { startedAt: 'desc' },
          include: {
            user: { select: { id: true, email: true, userId: true } },
          },
        },
        _count: {
          select: {
            attempts: { where: { status: 'completed' } },
          },
        },
      },
    })

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    return NextResponse.json(survey)
  } catch (error) {
    console.error('Survey detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch survey' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Only allow specific fields to be updated
    const allowedFields = [
      'wallId', 'externalId', 'title', 'description', 'timeMinutes', 'reward',
      'rating', 'available', 'category', 'country', 'language', 'maxCompletions',
      'isActive', 'startsAt', 'expiresAt',
    ]
    const data: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        data[key] = body[key]
      }
    }

    const survey = await db.survey.update({
      where: { id },
      data,
    })

    return NextResponse.json(survey)
  } catch (error) {
    console.error('Update survey error:', error)
    return NextResponse.json({ error: 'Failed to update survey' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.survey.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete survey error:', error)
    return NextResponse.json({ error: 'Failed to delete survey' }, { status: 500 })
  }
}
