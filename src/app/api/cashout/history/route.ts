import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/cashout/history - Get cashout history for a user
 * Query: userId
 * Includes reserveAmount and reserveStatus fields
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
        reserveAmount: true,
        reserveStatus: true,
        reserveReleasedAt: true,
      },
    })

    return NextResponse.json({ cashouts })
  } catch (error: any) {
    console.error('[Cashout History] Error:', error)

    if (error?.code === 'P1001') {
      return NextResponse.json(
        { error: 'Database connection failed. Please check DATABASE_URL environment variable.' },
        { status: 500 }
      )
    }
    if (error?.code === 'P2021') {
      return NextResponse.json(
        { error: 'Database tables not found. Please run: npx prisma db push' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch cashout history' },
      { status: 500 }
    )
  }
}
