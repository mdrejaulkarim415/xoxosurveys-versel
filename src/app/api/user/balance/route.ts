import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

const userSelect = {
  userId: true,
  balance: true,
  reservedBalance: true,
  pendingReserve: true,
  totalEarned: true,
  surveysCompleted: true,
  surveyTarget: true,
  emailVerified: true,
  earningRate: true,
  friendsInvited: true,
  unclaimedRevenue: true,
  referralEarnings: true,
  inviteCode: true,
  role: true,
  isBanned: true,
  isUnderReview: true,
  reviewReason: true,
  firstname: true,
  lastname: true,
  newsletter: true,
  language: true,
} satisfies Prisma.UserSelect

type UserResult = Prisma.UserGetPayload<{ select: typeof userSelect }>

/**
 * Get user's current balance and profile from the database.
 * Used by the frontend to poll for balance changes after survey completion postbacks
 * and to refresh user data including email verification status.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('user_id') || searchParams.get('userId')

    if (!userIdParam) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Support both cuid (clxxx/cmpxxx) and numeric userId
    let user: UserResult | null = null
    if (isNaN(Number(userIdParam))) {
      // Non-numeric = cuid id
      user = await db.user.findUnique({
        where: { id: userIdParam },
        select: userSelect,
      })
    } else {
      user = await db.user.findUnique({
        where: { userId: parseInt(userIdParam) },
        select: userSelect,
      })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('[User Balance] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
