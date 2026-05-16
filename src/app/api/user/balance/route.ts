import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Get user's current balance and profile from the database.
 * Used by the frontend to poll for balance changes after survey completion postbacks
 * and to refresh user data including email verification status.
 *
 * Uses Prisma ORM first, falls back to raw SQL if columns are missing in production.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('user_id') || searchParams.get('userId')

    if (!userIdParam) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Try Prisma ORM first
    try {
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
            userId: true,
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
            userId: true,
          },
        })
      }

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      return NextResponse.json(user, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    } catch (prismaError: any) {
      // If Prisma fails due to missing columns, fall back to raw SQL
      if (prismaError?.code === 'P2025' || prismaError?.message?.includes('column') || prismaError?.message?.includes('does not exist')) {
        console.warn('[User Balance] Prisma ORM failed, falling back to raw SQL:', prismaError?.message)
        return await handleWithRawSql(userIdParam)
      }
      throw prismaError // Re-throw if it's not a column issue
    }
  } catch (error) {
    console.error('[User Balance] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Fallback: Use raw SQL with auto-migration to ensure all columns exist
 */
async function handleWithRawSql(userIdParam: string): Promise<NextResponse> {
  // Ensure required columns exist (auto-migration)
  const migrations = [
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "earningRate" DOUBLE PRECISION NOT NULL DEFAULT 0.005`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "friendsInvited" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "unclaimedRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false`,
  ]

  for (const sql of migrations) {
    try {
      await db.$executeRawUnsafe(sql)
    } catch {
      // Column already exists or other non-critical error
    }
  }

  // Query user data using raw SQL
  let user: any = null
  if (userIdParam.startsWith('cl')) {
    const result = await db.$queryRaw`
      SELECT balance, "totalEarned", "surveysCompleted", "emailVerified",
             "earningRate", "friendsInvited", "unclaimedRevenue", "inviteCode",
             role, "isBanned", "userId"
      FROM "User"
      WHERE id = ${userIdParam}
      LIMIT 1
    `
    user = result[0] || null
  } else {
    const numericId = parseInt(userIdParam)
    const result = await db.$queryRaw`
      SELECT balance, "totalEarned", "surveysCompleted", "emailVerified",
             "earningRate", "friendsInvited", "unclaimedRevenue", "inviteCode",
             role, "isBanned", "userId"
      FROM "User"
      WHERE "userId" = ${numericId}
      LIMIT 1
    `
    user = result[0] || null
  }

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Convert BigInt fields to numbers if needed
  const response = {
    balance: Number(user.balance) || 0,
    totalEarned: Number(user.totalEarned) || 0,
    surveysCompleted: Number(user.surveysCompleted) || 0,
    emailVerified: Boolean(user.emailVerified),
    earningRate: Number(user.earningRate) || 0.005,
    friendsInvited: Number(user.friendsInvited) || 0,
    unclaimedRevenue: Number(user.unclaimedRevenue) || 0,
    inviteCode: user.inviteCode || '',
    role: user.role || 'user',
    isBanned: Boolean(user.isBanned),
    userId: Number(user.userId) || 0,
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
