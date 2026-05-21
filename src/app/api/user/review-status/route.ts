import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Lightweight endpoint to check only the user's review status.
 * Polled frequently (every 5s) by the frontend so that when an admin
 * puts an account under review, the user sees the overlay immediately.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('userId')

    if (!userIdParam) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    let user: { isUnderReview: boolean; reviewReason: string | null; isBanned: boolean } | null = null

    if (isNaN(Number(userIdParam))) {
      // Non-numeric = cuid id
      user = await db.user.findUnique({
        where: { id: userIdParam },
        select: { isUnderReview: true, reviewReason: true, isBanned: true },
      })
    } else {
      user = await db.user.findUnique({
        where: { userId: parseInt(userIdParam) },
        select: { isUnderReview: true, reviewReason: true, isBanned: true },
      })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      isUnderReview: user.isUnderReview,
      reviewReason: user.reviewReason,
      isBanned: user.isBanned,
    })
  } catch (error) {
    console.error('[Review Status] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
