import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const wall = await db.surveyWall.findUnique({
      where: { id },
      include: {
        surveys: { take: 50, orderBy: { createdAt: 'desc' } },
      },
    })

    if (!wall) {
      return NextResponse.json({ error: 'Survey wall not found' }, { status: 404 })
    }

    return NextResponse.json(wall)
  } catch (error) {
    console.error('Survey wall detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch survey wall' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Handle config as JSON string
    if (body.config && typeof body.config === 'object') {
      body.config = JSON.stringify(body.config)
    }

    const wall = await db.surveyWall.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(wall)
  } catch (error) {
    console.error('Update survey wall error:', error)
    return NextResponse.json({ error: 'Failed to update survey wall' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.surveyWall.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete survey wall error:', error)
    return NextResponse.json({ error: 'Failed to delete survey wall' }, { status: 500 })
  }
}
