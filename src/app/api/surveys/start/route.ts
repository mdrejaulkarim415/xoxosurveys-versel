import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, surveyId, ipAddress, deviceFingerprint } = body

    if (!userId || !surveyId) {
      return NextResponse.json({ error: 'User ID and Survey ID are required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'User is banned' }, { status: 403 })
    }

    const survey = await db.survey.findUnique({
      where: { id: surveyId },
      include: { wall: true },
    })
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    if (!survey.isActive || !survey.wall.isActive) {
      return NextResponse.json({ error: 'Survey is not available' }, { status: 400 })
    }

    // Check fraud score
    if (user.fraudScore >= survey.wall.minFraudScore) {
      return NextResponse.json({ error: 'User fraud score too high for this survey wall' }, { status: 403 })
    }

    // Check if already started and not completed
    const existingAttempt = await db.surveyAttempt.findFirst({
      where: {
        userId,
        surveyId,
        status: 'started',
      },
    })

    if (existingAttempt) {
      return NextResponse.json({ attempt: existingAttempt, message: 'Already started' })
    }

    // Create new attempt
    const attempt = await db.surveyAttempt.create({
      data: {
        userId,
        surveyId,
        status: 'started',
        ipAddress: ipAddress || null,
        deviceFingerprint: deviceFingerprint || null,
      },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        action: 'survey_start',
        details: JSON.stringify({ surveyId, surveyTitle: survey.title, wallId: survey.wallId }),
        ipAddress: ipAddress || null,
        deviceFingerprint: deviceFingerprint || null,
      },
    })

    return NextResponse.json({ attempt }, { status: 201 })
  } catch (error) {
    console.error('Start survey error:', error)
    return NextResponse.json({ error: 'Failed to start survey' }, { status: 500 })
  }
}
