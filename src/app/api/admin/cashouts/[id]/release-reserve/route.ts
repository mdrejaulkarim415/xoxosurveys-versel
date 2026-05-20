import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/admin/cashouts/[id]/release-reserve
 *
 * Admin endpoint to release the held reserve amount for a cashout.
 * This returns the reserve amount back to the user's available balance
 * and decrements their reservedBalance.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Find the cashout
    const cashout = await db.cashout.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        amount: true,
        reserveAmount: true,
        reserveStatus: true,
        status: true,
      },
    })

    if (!cashout) {
      return NextResponse.json({ error: 'Cashout not found' }, { status: 404 })
    }

    if (cashout.reserveAmount <= 0) {
      return NextResponse.json(
        { error: 'This cashout has no reserve amount' },
        { status: 400 }
      )
    }

    if (cashout.reserveStatus !== 'held') {
      return NextResponse.json(
        { error: `Reserve is already ${cashout.reserveStatus}` },
        { status: 400 }
      )
    }

    // Parse admin ID from request body (optional)
    let adminId = 'admin'
    try {
      const body = await request.json()
      if (body.adminId) adminId = body.adminId
    } catch {
      // No body or invalid JSON, use default adminId
    }

    // Release the reserve in a transaction
    const result = await db.$transaction(async (tx) => {
      // Update cashout: mark reserve as released
      const updatedCashout = await tx.cashout.update({
        where: { id },
        data: {
          reserveStatus: 'released',
          reserveReleasedAt: new Date(),
        },
      })

      // Get user's current reservedBalance to know how much was actually collected upfront
      const userCurrent = await tx.user.findUnique({
        where: { id: cashout.userId },
        select: { reservedBalance: true, pendingReserve: true },
      })

      // The upfront portion is what's in reservedBalance (capped by this cashout's reserve)
      const upfrontPortion = Math.min(cashout.reserveAmount, userCurrent?.reservedBalance || 0)
      // The pending portion is the rest
      const pendingPortion = cashout.reserveAmount - upfrontPortion

      // Build user update data
      const userUpdateData: Record<string, unknown> = {}

      // Release the upfront portion from reservedBalance back to available balance
      if (upfrontPortion > 0) {
        userUpdateData.reservedBalance = { decrement: upfrontPortion }
        userUpdateData.balance = { increment: upfrontPortion }
      }

      // Cancel any pending reserve collection for this cashout
      if (pendingPortion > 0 && userCurrent && userCurrent.pendingReserve > 0) {
        const cancelAmount = Math.min(pendingPortion, userCurrent.pendingReserve)
        userUpdateData.pendingReserve = { decrement: cancelAmount }
        // Also credit the pending portion that was already collected from earnings
        // Since it was moved to reservedBalance already, increment balance for that too
        const alreadyCollectedFromEarnings = pendingPortion - cancelAmount
        // If some was already collected via earnings and is in reservedBalance, release it
        if (alreadyCollectedFromEarnings > 0 && (userCurrent.reservedBalance - upfrontPortion) > 0) {
          const releaseFromEarnings = Math.min(alreadyCollectedFromEarnings, userCurrent.reservedBalance - upfrontPortion)
          if (releaseFromEarnings > 0) {
            userUpdateData.balance = { increment: (upfrontPortion || 0) + releaseFromEarnings }
            userUpdateData.reservedBalance = { decrement: upfrontPortion + releaseFromEarnings }
          }
        }
      }

      // Apply user updates
      if (Object.keys(userUpdateData).length > 0) {
        const updatedUser = await tx.user.update({
          where: { id: cashout.userId },
          data: userUpdateData,
          select: { balance: true, reservedBalance: true, pendingReserve: true },
        })

        // Create audit log
        await tx.auditLog.create({
          data: {
            adminId,
            action: 'reserve_released',
            target: id,
            details: JSON.stringify({
              cashoutId: id,
              userId: cashout.userId,
              reserveAmount: cashout.reserveAmount,
              upfrontPortion,
              pendingPortion,
              withdrawalAmount: cashout.amount,
              previousReserveStatus: 'held',
              newReserveStatus: 'released',
            }),
          },
        })

        // Create notification for the user
        await tx.notification.create({
          data: {
            userId: cashout.userId,
            type: 'cashout',
            title: 'Reserve Released',
            message: `Your reserve of $${cashout.reserveAmount.toFixed(2)} for your $${cashout.amount.toFixed(2)} cashout has been released and returned to your balance.`,
            iconType: 'money',
            metadata: JSON.stringify({
              cashoutId: id,
              reserveAmount: cashout.reserveAmount,
            }),
          },
        })

        return { cashout: updatedCashout, user: updatedUser }
      }

      return { cashout: updatedCashout, user: userCurrent }
    })

    return NextResponse.json({
      success: true,
      message: `Reserve of $${cashout.reserveAmount.toFixed(2)} released successfully`,
      cashout: {
        id: result.cashout.id,
        reserveStatus: result.cashout.reserveStatus,
        reserveReleasedAt: result.cashout.reserveReleasedAt,
      },
      user: {
        balance: result.user.balance,
        reservedBalance: result.user.reservedBalance,
      },
    })
  } catch (error: unknown) {
    console.error('[Release Reserve] Error:', error)
    return NextResponse.json(
      { error: 'Failed to release reserve' },
      { status: 500 }
    )
  }
}
