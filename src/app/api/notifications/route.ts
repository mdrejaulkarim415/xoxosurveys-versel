import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/notifications?userId=xxx
 * Fetch latest 10 notifications for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Find user by cuid or numeric userId
    const user = await db.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { userId: parseInt(userId) || -1 },
        ],
      },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get latest 10 notifications
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Get unread count
    const unreadCount = await db.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    })

    // Clean up: delete old read notifications beyond the latest 10
    const allNotifs = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (allNotifs.length > 10) {
      const idsToDelete = allNotifs.slice(10).map(n => n.id)
      if (idsToDelete.length > 0) {
        await db.notification.deleteMany({
          where: {
            id: { in: idsToDelete },
            isRead: true, // Only delete read ones beyond the 10 limit
          },
        })
      }
    }

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('[Notifications GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/notifications
 * Mark all notifications as read for a user
 * Body: { userId: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Find user by cuid or numeric userId
    const user = await db.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { userId: parseInt(userId) || -1 },
        ],
      },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Mark all unread notifications as read
    const result = await db.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      markedAsRead: result.count,
    })
  } catch (error) {
    console.error('[Notifications PATCH] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
