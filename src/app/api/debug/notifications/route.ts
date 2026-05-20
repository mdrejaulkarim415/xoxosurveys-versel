import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Debug endpoint: GET /api/debug/notifications?userId=xxx
 *
 * This checks if the Notification system is working properly.
 * It tests:
 * 1. Can we find the user?
 * 2. Does the Notification table exist?
 * 3. Can we read notifications?
 * 4. Can we create a test notification? (add &create=true)
 *
 * IMPORTANT: Remove this endpoint in production or protect it with admin auth!
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required. Usage: /api/debug/notifications?userId=100' }, { status: 400 })
  }

  const results: Record<string, any> = { step: '', success: false }

  try {
    // Step 1: Find user
    results.step = '1_find_user'
    const user = await db.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { userId: parseInt(userId) || -1 },
        ],
      },
      select: { id: true, userId: true, email: true },
    })

    if (!user) {
      results.error = `User not found for userId: ${userId}`
      results.hint = 'Check if the userId is correct (numeric like 100, or CUID like "cm2abc...")'
      return NextResponse.json(results, { status: 404 })
    }

    results.user = { id: user.id, userId: user.userId, email: user.email }
    results.success = true

    // Step 2: Check if Notification table exists by trying to count
    results.step = '2_check_notification_table'
    try {
      const count = await db.notification.count({
        where: { userId: user.id },
      })
      results.notificationTableExists = true
      results.existingNotificationCount = count
      results.success = true
    } catch (tableError: any) {
      results.notificationTableExists = false
      results.error = tableError.message
      results.hint = 'The Notification table does not exist in the database. Run: npx prisma db push'
      results.success = false
      return NextResponse.json(results, { status: 500 })
    }

    // Step 3: Fetch existing notifications
    results.step = '3_fetch_notifications'
    try {
      const notifications = await db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
      results.recentNotifications = notifications.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        iconType: n.iconType,
        offerwall: n.offerwall,
        rewardAmount: n.rewardAmount,
        createdAt: n.createdAt,
      }))
      results.success = true
    } catch (fetchError: any) {
      results.error = fetchError.message
      results.success = false
    }

    // Step 4: Create a test notification (only if create=true param)
    const shouldCreate = searchParams.get('create') === 'true'
    if (shouldCreate) {
      results.step = '4_create_test_notification'
      try {
        const testNotif = await db.notification.create({
          data: {
            userId: user.id,
            type: 'offer_complete',
            title: 'Test Notification',
            message: `This is a test notification created at ${new Date().toISOString()}`,
            iconType: 'reward',
            offerwall: 'Debug Test',
            rewardAmount: 0.01,
            metadata: JSON.stringify({ test: true, createdAt: new Date().toISOString() }),
          },
        })
        results.testNotificationCreated = true
        results.testNotificationId = testNotif.id
        results.success = true
        results.hint = 'Test notification created! Check the notification bell in the dashboard.'
      } catch (createError: any) {
        results.testNotificationCreated = false
        results.error = createError.message
        results.hint = 'Failed to create notification. The Notification table columns may not match the schema. Run: npx prisma db push'
        results.success = false
      }
    }

    // Step 5: Check unread count
    results.step = '5_unread_count'
    try {
      const unreadCount = await db.notification.count({
        where: { userId: user.id, isRead: false },
      })
      results.unreadCount = unreadCount
      results.success = true
    } catch (countError: any) {
      results.error = countError.message
      results.success = false
    }

    results.overallStatus = results.notificationTableExists ? 'OK' : 'BROKEN - Notification table missing'

  } catch (error: any) {
    results.step = 'unexpected_error'
    results.error = error.message
    results.success = false
  }

  return NextResponse.json(results)
}
