import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendCashoutApprovedEmail, sendCashoutRejectedEmail } from '@/lib/email'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, isFlagged, flagReason, reviewedBy, chargebackReason, chargebackBy, deductBalance } = body

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (isFlagged !== undefined) updateData.isFlagged = isFlagged
    if (flagReason) updateData.flagReason = flagReason
    if (reviewedBy) updateData.reviewedBy = reviewedBy
    if (status === 'approved' || status === 'rejected') {
      updateData.reviewedAt = new Date()
    }
    if (status === 'processed') {
      updateData.processedAt = new Date()
    }

    // Chargeback handling
    if (status === 'chargeback') {
      updateData.isChargeback = true
      updateData.chargebackReason = chargebackReason || 'No reason provided'
      updateData.chargebackBy = chargebackBy || 'admin'
      updateData.chargebackAt = new Date()
      updateData.isFlagged = true
      updateData.flagReason = `Chargeback: ${chargebackReason || 'No reason provided'}`

      // Get the cashout to know the amount and userId
      const cashout = await db.cashout.findUnique({
        where: { id },
        select: { amount: true, userId: true, chargebackAmount: true },
      })

      if (cashout) {
        updateData.chargebackAmount = cashout.amount

        // Deduct balance from user if requested
        if (deductBalance) {
          updateData.balanceDeducted = true
          await db.user.update({
            where: { id: cashout.userId },
            data: {
              balance: { decrement: cashout.amount },
            },
          })
        } else {
          updateData.balanceDeducted = false
        }
      }
    }

    // Rejection handling: auto-release reserve and refund withdrawal amount
    if (status === 'rejected') {
      const cashoutForReject = await db.cashout.findUnique({
        where: { id },
        select: {
          userId: true,
          amount: true,
          reserveAmount: true,
          reserveStatus: true,
          giftCardType: true,
        },
      })

      if (cashoutForReject && cashoutForReject.reserveAmount > 0 && cashoutForReject.reserveStatus === 'held') {
        // Refund the withdrawal amount + release reserve back to user balance
        // Also cancel any pendingReserve for this cashout
        const totalRefund = cashoutForReject.amount + cashoutForReject.reserveAmount

        // Calculate how much reserve was actually collected upfront vs pending
        // The cashout record has the full reserveAmount, but some may be in pendingReserve
        const userForReject = await db.user.findUnique({
          where: { id: cashoutForReject.userId },
          select: { reservedBalance: true, pendingReserve: true },
        })

        // The upfront reserve is what's in reservedBalance for this cashout
        // The pending portion needs to be cancelled from pendingReserve
        const upfrontReserveCollected = Math.min(cashoutForReject.reserveAmount, userForReject?.reservedBalance || 0)
        const pendingReserveToCancel = cashoutForReject.reserveAmount - upfrontReserveCollected

        await db.$transaction(async (tx) => {
          // Update cashout: mark reserve as released and set rejection
          await tx.cashout.update({
            where: { id },
            data: {
              ...updateData,
              reserveStatus: 'released',
              reserveReleasedAt: new Date(),
            },
          })

          // Build user update data
          const userUpdateData: Record<string, unknown> = {
            balance: { increment: totalRefund },
          }

          // Decrement reservedBalance by the upfront portion collected
          if (upfrontReserveCollected > 0) {
            userUpdateData.reservedBalance = { decrement: upfrontReserveCollected }
          }

          // Cancel any pending reserve that was queued from this cashout
          if (pendingReserveToCancel > 0 && userForReject && userForReject.pendingReserve > 0) {
            const cancelAmount = Math.min(pendingReserveToCancel, userForReject.pendingReserve)
            userUpdateData.pendingReserve = { decrement: cancelAmount }
          }

          await tx.user.update({
            where: { id: cashoutForReject.userId },
            data: userUpdateData,
          })

          // Create audit log for reserve release on rejection
          await tx.auditLog.create({
            data: {
              adminId: reviewedBy || 'admin',
              action: 'reserve_released_on_rejection',
              target: id,
              details: JSON.stringify({
                cashoutId: id,
                userId: cashoutForReject.userId,
                withdrawalAmount: cashoutForReject.amount,
                reserveAmount: cashoutForReject.reserveAmount,
                totalRefund,
                reason: 'Cashout rejected - reserve and withdrawal refunded',
              }),
            },
          })

          // Create notification for the user
          await tx.notification.create({
            data: {
              userId: cashoutForReject.userId,
              type: 'cashout',
              title: 'Cashout Rejected - Funds Returned',
              message: `Your cashout of $${cashoutForReject.amount.toFixed(2)} was rejected. $${totalRefund.toFixed(2)} has been returned to your balance (withdrawal: $${cashoutForReject.amount.toFixed(2)} + released reserve: $${cashoutForReject.reserveAmount.toFixed(2)}).`,
              iconType: 'money',
              metadata: JSON.stringify({
                cashoutId: id,
                withdrawalAmount: cashoutForReject.amount,
                reserveAmount: cashoutForReject.reserveAmount,
                totalRefund,
              }),
            },
          })
        })

        // Skip the normal update below since we already updated in the transaction
        // Fetch the updated cashout for the response
        const updatedCashout = await db.cashout.findUnique({ where: { id } })

        // Send rejection email
        if (updatedCashout) {
          const user = await db.user.findUnique({
            where: { id: cashoutForReject.userId },
            select: { email: true },
          })

          if (user) {
            const method = cashoutForReject.giftCardType || 'Unknown'
            sendCashoutRejectedEmail(user.email, cashoutForReject.amount, method, flagReason || undefined).catch(err =>
              console.error('[Cashout] Failed to send rejection email:', err)
            )
          }
        }

        return NextResponse.json(updatedCashout)
      }
    }

    const cashout = await db.cashout.update({
      where: { id },
      data: updateData,
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        adminId: reviewedBy || chargebackBy || 'admin',
        action: `cashout_${status || 'update'}`,
        target: id,
        details: JSON.stringify({
          ...updateData,
          chargeback: status === 'chargeback',
        }),
      },
    })

    // Log activity for the user if chargeback
    if (status === 'chargeback' && cashout) {
      await db.activityLog.create({
        data: {
          userId: cashout.userId,
          action: 'chargeback',
          details: JSON.stringify({
            cashoutId: id,
            amount: cashout.amount,
            reason: chargebackReason,
            balanceDeducted: deductBalance || false,
          }),
        },
      })
    }

    // Send email notification for approved or rejected cashouts
    if ((status === 'approved' || status === 'rejected') && cashout) {
      // Get user email
      const user = await db.user.findUnique({
        where: { id: cashout.userId },
        select: { email: true },
      })

      if (user) {
        const method = cashout.giftCardType || 'Unknown'
        if (status === 'approved') {
          sendCashoutApprovedEmail(user.email, cashout.amount, method).catch(err =>
            console.error('[Cashout] Failed to send approval email:', err)
          )
        } else if (status === 'rejected') {
          sendCashoutRejectedEmail(user.email, cashout.amount, method, flagReason || undefined).catch(err =>
            console.error('[Cashout] Failed to send rejection email:', err)
          )
        }
      }
    }

    return NextResponse.json(cashout)
  } catch (error) {
    console.error('Update cashout error:', error)
    return NextResponse.json({ error: 'Failed to update cashout' }, { status: 500 })
  }
}
