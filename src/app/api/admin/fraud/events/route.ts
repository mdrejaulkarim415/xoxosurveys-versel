import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity')
    const eventType = searchParams.get('eventType')
    const resolved = searchParams.get('resolved')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (severity && severity !== 'all') where.severity = severity
    if (eventType && eventType !== 'all') where.eventType = eventType
    if (resolved === 'true') where.isResolved = true
    if (resolved === 'false') where.isResolved = false

    const [events, total] = await Promise.all([
      db.fraudEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      db.fraudEvent.count({ where }),
    ])

    return NextResponse.json({ events, total, page, limit })
  } catch (error) {
    console.error('Fraud events list error:', error)
    return NextResponse.json({ error: 'Failed to fetch fraud events' }, { status: 500 })
  }
}
