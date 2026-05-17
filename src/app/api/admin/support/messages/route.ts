import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/support/messages - List all support messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || undefined

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { message: { contains: search } },
      ]
    }

    const [messages, total] = await Promise.all([
      db.supportMessage.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstname: true,
              lastname: true,
              userId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.supportMessage.count({ where }),
    ])

    // Count by status for badges
    const statusCounts = await db.supportMessage.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    const counts: Record<string, number> = { open: 0, read: 0, replied: 0, closed: 0 }
    statusCounts.forEach((s) => {
      counts[s.status] = s._count.status
    })

    return NextResponse.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      counts,
    })
  } catch (error: any) {
    console.error('[Admin Support] Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
