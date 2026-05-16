import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    // Support both cuid (clxxx) and numeric userId
    let user = null
    if (userIdParam.startsWith('cl')) {
      user = await db.user.findUnique({
        where: { id: userIdParam },
        select: {
          balance: true,
          totalEarned: true,
          surveysCompleted: true,
          emailVerified: true,
          earningRate: true,
          friendsInvited: true,
          unclaimedRevenue: true,
          inviteCode: true,
          role: true,
          isBanned: true,
        },
      })
    } else {
      user = await db.user.findUnique({
        where: { userId: parseInt(userIdParam) },
        select: {
          balance: true,
          totalEarned: true,
          surveysCompleted: true,
          emailVerified: true,
          earningRate: true,
          friendsInvited: true,
          unclaimedRevenue: true,
          inviteCode: true,
          role: true,
          isBanned: true,
        },
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
