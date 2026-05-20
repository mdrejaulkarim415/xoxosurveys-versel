import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/support/messages?userId=xxx
 * Fetch all support messages for a logged-in user, including admin replies
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
      select: { id: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch all support messages from this user (by userId relation OR by email)
    const messages = await db.supportMessage.findMany({
      where: {
        OR: [
          { userId: user.id },
          { email: user.email },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        message: true,
        status: true,
        adminReply: true,
        repliedBy: true,
        createdAt: true,
        repliedAt: true,
      },
    })

    // Count unread replies (messages where admin has replied but user hasn't seen)
    const unreadReplies = messages.filter(
      (msg) => msg.adminReply && msg.status === 'replied'
    ).length

    return NextResponse.json({
      messages,
      total: messages.length,
      unreadReplies,
    })
  } catch (error) {
    console.error('[Support Messages GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
