import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const giftCardType = searchParams.get('giftCardType')
    const isFlagged = searchParams.get('isFlagged')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status && status !== 'all') where.status = status
    if (giftCardType && giftCardType !== 'all') where.giftCardType = giftCardType
    if (isFlagged === 'true') where.isFlagged = true

    const [cashouts, total] = await Promise.all([
      db.cashout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      db.cashout.count({ where }),
    ])

    return NextResponse.json({ cashouts, total, page, limit })
  } catch (error) {
    console.error('Cashouts list error:', error)
    return NextResponse.json({ error: 'Failed to fetch cashouts' }, { status: 500 })
  }
}
