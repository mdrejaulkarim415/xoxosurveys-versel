import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const survey = await db.survey.findUnique({
      where: { id },
      include: {
        wall: { select: { id: true, name: true, provider: true } },
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
