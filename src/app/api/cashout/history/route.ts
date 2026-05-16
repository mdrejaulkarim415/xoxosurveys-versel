import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/cashout/history - Get cashout history for a user
 * Query: userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const cashouts = await db.cashout.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        giftCardType: true,
        amount: true,
        status: true,
        createdAt: true,
        processedAt: true,
      },
    })

    return NextResponse.json({ cashouts })
  } catch (error: any) {
    console.error('[Cashout History] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cashout history' },
      { status: 500 }
    )
  }
}
