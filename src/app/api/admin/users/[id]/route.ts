import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await db.user.findUnique({
      where: { id },
      include: {
        surveyAttempts: { take: 20, orderBy: { startedAt: 'desc' } },
        cashouts: { take: 20, orderBy: { createdAt: 'desc' } },
        activityLogs: { take: 20, orderBy: { createdAt: 'desc' } },
        fraudEvents: { take: 20, orderBy: { createdAt: 'desc' } },
        ips: { orderBy: { lastSeen: 'desc' } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('User detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = [
      'name', 'firstname', 'lastname', 'email', 'role', 'balance', 'totalEarned',
      'surveysCompleted', 'fraudScore', 'isFlagged', 'isBanned', 'isActive',
      'banReason', 'emailVerified', 'isUnderReview', 'reviewReason',
      'deviceFingerprint', 'fraudFlags',
    ]
    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key]
      }
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
