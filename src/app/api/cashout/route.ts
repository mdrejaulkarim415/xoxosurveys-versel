import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/cashout - Create a new cashout request
 * Body: { userId, giftCardType, amount, paymentDetail }
 *
 * Reserve Amount Logic:
 * - For every $5 withdrawn, $2 is held in reserve
 * - reserveAmount = Math.floor(withdrawalAmount / 5) * 2
 * - Total deduction = withdrawalAmount + reserveAmount
 * - The reserve is stored in Cashout.reserveAmount and User.reservedBalance
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

    // Calculate reserve amount: $2 reserve per $5 withdrawal
    const reserveAmount = Math.floor(amountNum / 5) * 2
    const totalDeduction = amountNum + reserveAmount

    // Find user by cuid
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true, emailVerified: true, isBanned: true, isUnderReview: true, email: true },
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

    // Check total deduction (withdrawal + reserve)
    if (user.balance < totalDeduction) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You need at least $${totalDeduction.toFixed(2)} (withdrawal: $${amountNum.toFixed(2)} + reserve: $${reserveAmount.toFixed(2)})`,
        },
        { status: 400 }
      )
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

    // Create cashout and deduct balance in a transaction
    const cashout = await db.$transaction(async (tx) => {
      // Deduct total (withdrawal + reserve) from user balance
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: totalDeduction },
          reservedBalance: { increment: reserveAmount },
        },
        select: { balance: true, reservedBalance: true },
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
            totalDeduction,
            paymentDetail: paymentDetail?.trim() || null,
          }),
          ipAddress,
        },
      })

      return { ...newCashout, newBalance: updatedUser.balance, newReservedBalance: updatedUser.reservedBalance }
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
      reserveAmount,
      totalDeduction,
    })
  } catch (error: unknown) {
    console.error('[Cashout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process cashout request' },
      { status: 500 }
    )
  }
}
