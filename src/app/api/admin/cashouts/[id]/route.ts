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
