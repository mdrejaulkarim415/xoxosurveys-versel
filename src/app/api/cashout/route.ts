import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/cashout - Create a new cashout request
 * Body: { userId, giftCardType, amount, paymentDetail }
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

    // Find user by cuid
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true, emailVerified: true, isBanned: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Account is suspended' }, { status: 403 })
    }

    if (!user.emailVerified) {
      return NextResponse.json({ error: 'Email must be verified to cash out' }, { status: 403 })
    }

    if (user.balance < amountNum) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
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
      // Deduct balance
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amountNum } },
        select: { balance: true },
      })

      // Create cashout record
      const newCashout = await tx.cashout.create({
        data: {
          userId: user.id,
          giftCardType,
          amount: amountNum,
          paymentDetail: paymentDetail?.trim() || null,
          ipAddress,
          status: 'pending',
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
            paymentDetail: paymentDetail?.trim() || null,
          }),
          ipAddress,
        },
      })

      return { ...newCashout, newBalance: updatedUser.balance }
    })

    return NextResponse.json({
      success: true,
      cashout: {
        id: cashout.id,
        giftCardType: cashout.giftCardType,
        amount: cashout.amount,
        paymentDetail: cashout.paymentDetail,
        status: cashout.status,
        createdAt: cashout.createdAt,
      },
      newBalance: cashout.newBalance,
    })
  } catch (error: any) {
    console.error('[Cashout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process cashout request' },
      { status: 500 }
    )
  }
}
