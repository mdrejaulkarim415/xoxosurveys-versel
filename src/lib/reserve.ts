import { db } from './db'

/**
 * Collect pending reserve from user's survey earnings.
 *
 * When a user has a pendingReserve balance (from cashouts where full reserve
 * couldn't be collected upfront), this function diverts 40% of their new
 * earnings to pay off the pending reserve.
 *
 * Call this BEFORE or ALONGSIDE the user balance update in survey callback routes.
 *
 * @param userId - The user's cuid
 * @param earnedAmount - The amount the user just earned from a survey
 * @returns Object with reserveCollected and balanceCredited amounts
 */
export async function collectPendingReserve(
  userId: string,
  earnedAmount: number
): Promise<{ reserveCollected: number; balanceCredited: number }> {
  try {
    // Check if user has pending reserve
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { pendingReserve: true },
    })

    if (!user || user.pendingReserve <= 0) {
      // No pending reserve — full amount goes to balance
      return { reserveCollected: 0, balanceCredited: earnedAmount }
    }

    // Calculate how much to collect from this earning (40% of earning)
    const maxCollection = Math.round(earnedAmount * 0.4 * 100) / 100
    const collection = Math.min(maxCollection, user.pendingReserve)
    const balanceCredited = earnedAmount - collection

    // Update user: add full earning to balance, move collection to reservedBalance, decrease pendingReserve
    await db.user.update({
      where: { id: userId },
      data: {
        reservedBalance: { increment: collection },
        pendingReserve: { decrement: collection },
        // Note: balance increment is handled by the caller
      },
    })

    console.log(
      `[Reserve Collection] User ${userId}: Earned $${earnedAmount.toFixed(2)}, ` +
      `Collected $${collection.toFixed(2)} to reserve, ` +
      `Credited $${balanceCredited.toFixed(2)} to available balance, ` +
      `Remaining pending: $${(user.pendingReserve - collection).toFixed(2)}`
    )

    return { reserveCollected: collection, balanceCredited }
  } catch (error) {
    console.error('[Reserve Collection] Error:', error)
    // On error, credit full amount to balance (fail open)
    return { reserveCollected: 0, balanceCredited: earnedAmount }
  }
}

/**
 * Calculate the smooth reserve amount for a given withdrawal amount.
 * NEW formula: 40% of withdrawal (smooth, no step jumps)
 * OLD formula was: Math.floor(amount / 5) * 2 (step-based, gameable)
 */
export function calculateReserve(withdrawalAmount: number): number {
  return Math.round(withdrawalAmount * 0.4 * 100) / 100
}

/**
 * Calculate total deduction (withdrawal + reserve) for a cashout
 */
export function calculateTotalDeduction(withdrawalAmount: number): number {
  return withdrawalAmount + calculateReserve(withdrawalAmount)
}
