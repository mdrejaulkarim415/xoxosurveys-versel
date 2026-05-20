import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/notifications?userId=xxx
 * Fetch latest 20 notifications for a user + unread count
 *
 * userId can be either:
 * - CUID (e.g. "cm2abc...") → matched against User.id
 * - Numeric ID (e.g. 100) → matched against User.userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Find user by cuid or numeric userId
    let user
    try {
      user = await db.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { userId: parseInt(userId) || -1 },
          ],
        },
        select: { id: true },
      })
    } catch (dbError) {
      console.error('[Notifications GET] Database query error finding user:', dbError)
      return NextResponse.json({ error: 'Database error', notifications: [], unreadCount: 0 }, { status: 500 })
    }

    if (!user) {
      console.warn('[Notifications GET] User not found for userId:', userId)
      return NextResponse.json({ error: 'User not found', notifications: [], unreadCount: 0 }, { status: 404 })
    }

    // Get latest 20 notifications
    let notifications
    try {
      notifications = await db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    } catch (dbError) {
      console.error('[Notifications GET] Database query error fetching notifications:', dbError)
      // If the Notification table doesn't exist, return empty instead of crashing
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
        debug: 'Notification table may not exist. Run: npx prisma db push',
      })
    }

    // Get unread count
    let unreadCount = 0
    try {
      unreadCount = await db.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      })
    } catch (dbError) {
      console.error('[Notifications GET] Database query error counting unread:', dbError)
    }

    // Clean up: delete old read notifications beyond the latest 20
    try {
      const allNotifs = await db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, isRead: true },
      })

      if (allNotifs.length > 20) {
        const idsToDelete = allNotifs.slice(20).filter(n => n.isRead).map(n => n.id)
        if (idsToDelete.length > 0) {
          await db.notification.deleteMany({
            where: {
              id: { in: idsToDelete },
              isRead: true,
            },
          })
        }
      }
    } catch (dbError) {
      // Cleanup failure is non-critical
      console.warn('[Notifications GET] Cleanup failed:', dbError)
    }

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('[Notifications GET] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error', notifications: [], unreadCount: 0 }, { status: 500 })
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
    let user
    try {
      user = await db.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { userId: parseInt(userId) || -1 },
          ],
        },
        select: { id: true },
      })
    } catch (dbError) {
      console.error('[Notifications PATCH] Database query error:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Mark all unread notifications as read
    try {
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
    } catch (dbError) {
      console.error('[Notifications PATCH] Failed to mark as read:', dbError)
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }
  } catch (error) {
    console.error('[Notifications PATCH] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
