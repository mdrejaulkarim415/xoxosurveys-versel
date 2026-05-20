import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/cashout - Create a new cashout request
 * Body: { userId, giftCardType, amount, paymentDetail }
 *
 * NEW Reserve Amount Logic (Progressive + Smooth):
 * - Reserve rate: 40% of withdrawal amount (smooth, no step jumps)
 * - reserveAmount = Math.round(amount * 0.4 * 100) / 100
 * - If user has enough balance: full reserve collected upfront
 * - If not enough for full reserve: minimum $2 upfront + rest becomes pendingReserve
 * - pendingReserve is collected from future survey earnings (40% of each earning)
 *
 * This prevents users from gaming the system by withdrawing just under $10
 * to avoid the $4 reserve step-jump in the old formula.
 *
 * Old formula: Math.floor(amount / 5) * 2  (step-based, gameable)
 * New formula: Math.round(amount * 0.4 * 100) / 100  (smooth, continuous)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, giftCardType, amount, paymentDetail } = body

    // Validate required fields
    if (!userId || !giftCardType || !amount) {
      return NextResponse.json(
        { error: 'userId, giftCardType, and amount are required' },
        { status: 400 }
      )
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // NEW: Calculate reserve amount with smooth formula (40% of withdrawal, no step jumps)
    // This prevents gaming by withdrawing just under $10
    const reserveAmount = Math.round(amountNum * 0.4 * 100) / 100
    const totalDeduction = amountNum + reserveAmount

    // Find user by cuid
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true, emailVerified: true, isBanned: true, isUnderReview: true, email: true, pendingReserve: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Account is suspended' }, { status: 403 })
    }

    if (user.isUnderReview) {
      return NextResponse.json({ error: 'Your account is under review. Please contact support team to make it faster.' }, { status: 403 })
    }

    if (!user.emailVerified) {
      return NextResponse.json({ error: 'Email must be verified to cash out' }, { status: 403 })
    }

    // Min/max amounts per gift card type
    const limits: Record<string, { min: number; max: number }> = {
      'binance': { min: 5, max: 100 },
      'litecoin': { min: 5, max: 100 },
      'paypal': { min: 5, max: 100 },
      'amazon': { min: 5, max: 50 },
      'google-play': { min: 10, max: 50 },
    }

    const limit = limits[giftCardType]
    if (limit && (amountNum < limit.min || amountNum > limit.max)) {
      return NextResponse.json(
        { error: `Amount must be between $${limit.min} and $${limit.max} for ${giftCardType}` },
        { status: 400 }
      )
    }

    // Validate payment detail for crypto/PayPal
    if (['binance', 'litecoin', 'paypal'].includes(giftCardType) && !paymentDetail?.trim()) {
      return NextResponse.json(
        { error: `Payment detail is required for ${giftCardType}` },
        { status: 400 }
      )
    }

    // Get IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : null

    // Determine how much reserve can be collected upfront
    // If user has enough balance for full reserve: collect all upfront
    // If not enough: collect what's available, rest becomes pendingReserve (collected from future earnings)
    let upfrontReserve = reserveAmount
    let pendingReserveAdd = 0
    const minUpfrontReserve = 2.00 // Minimum $2 reserve upfront

    if (user.balance < totalDeduction) {
      // User doesn't have enough for full reserve
      // Check if they at least have enough for withdrawal + minimum upfront
      if (user.balance >= amountNum + minUpfrontReserve) {
        // Can pay minimum upfront, rest goes to pending
        upfrontReserve = minUpfrontReserve
        pendingReserveAdd = reserveAmount - minUpfrontReserve
      } else if (user.balance >= amountNum) {
        // Can barely pay the withdrawal, all reserve goes to pending
        upfrontReserve = user.balance - amountNum
        if (upfrontReserve < 0) upfrontReserve = 0
        pendingReserveAdd = reserveAmount - upfrontReserve
      } else {
        // Not enough even for the withdrawal
        return NextResponse.json(
          {
            error: `Insufficient balance. You need at least $${amountNum.toFixed(2)} for withdrawal. Reserve: $${reserveAmount.toFixed(2)} (collected from future earnings if balance is low)`,
          },
          { status: 400 }
        )
      }
    }

    const actualDeduction = amountNum + upfrontReserve

    // Create cashout and deduct balance in a transaction
    const cashout = await db.$transaction(async (tx) => {
      // Deduct withdrawal + upfront reserve from user balance
      const updateData: Record<string, unknown> = {
        balance: { decrement: actualDeduction },
      }

      // Add upfront reserve to reservedBalance
      if (upfrontReserve > 0) {
        updateData.reservedBalance = { increment: upfrontReserve }
      }

      // Add pending reserve (to be collected from future earnings)
      if (pendingReserveAdd > 0) {
        updateData.pendingReserve = { increment: pendingReserveAdd }
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: updateData,
        select: { balance: true, reservedBalance: true, pendingReserve: true },
      })

      // Create cashout record with reserve info
      const newCashout = await tx.cashout.create({
        data: {
          userId: user.id,
          giftCardType,
          amount: amountNum,
          paymentDetail: paymentDetail?.trim() || null,
          ipAddress,
          status: 'pending',
          reserveAmount,
          reserveStatus: 'held',
        },
      })

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'cashout_request',
          details: JSON.stringify({
            cashoutId: newCashout.id,
            giftCardType,
            amount: amountNum,
            reserveAmount,
            upfrontReserve,
            pendingReserve: pendingReserveAdd,
            totalDeduction: actualDeduction,
            paymentDetail: paymentDetail?.trim() || null,
          }),
          ipAddress,
        },
      })

      return {
        ...newCashout,
        newBalance: updatedUser.balance,
        newReservedBalance: updatedUser.reservedBalance,
        newPendingReserve: updatedUser.pendingReserve,
      }
    })

    return NextResponse.json({
      success: true,
      cashout: {
        id: cashout.id,
        giftCardType: cashout.giftCardType,
        amount: cashout.amount,
        paymentDetail: cashout.paymentDetail,
        status: cashout.status,
        reserveAmount: cashout.reserveAmount,
        reserveStatus: cashout.reserveStatus,
        createdAt: cashout.createdAt,
      },
      newBalance: cashout.newBalance,
      newReservedBalance: cashout.newReservedBalance,
      newPendingReserve: cashout.newPendingReserve,
      reserveAmount,
      upfrontReserve,
      pendingReserve: pendingReserveAdd,
      totalDeduction: actualDeduction,
    })
  } catch (error: any) {
    console.error('[Cashout] Error:', error)

    // Provide specific error messages for common database issues
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
    if (error?.code === 'P2034') {
      return NextResponse.json(
        { error: 'Transaction conflict. Please try again.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process cashout request', details: process.env.NODE_ENV === 'development' ? error?.message : undefined },
      { status: 500 }
    )
  }
}
