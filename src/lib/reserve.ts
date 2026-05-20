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
 * Calculate the tiered reserve amount for a given withdrawal amount.
 *
 * Formula: Math.ceil(amount / 5) * 2
 * - Every $5 step adds $2 reserve
 * - $0.01-$5.00 → $2 reserve
 * - $5.01-$10.00 → $4 reserve
 * - $10.01-$15.00 → $6 reserve
 * - $15.01-$20.00 → $8 reserve
 * - etc.
 *
 * This prevents users from gaming the system by withdrawing just under $10
 * to avoid a higher reserve step. Even $5.01 triggers the $4 reserve (same as $10).
 *
 * Quick buttons ($5, $10, $25, $50) reserves remain the same:
 * - $5 → $2, $10 → $4, $25 → $10, $50 → $20
 */
export function calculateReserve(withdrawalAmount: number): number {
  if (withdrawalAmount <= 0) return 0
  return Math.ceil(withdrawalAmount / 5) * 2
}

/**
 * Get reserve tier information for a given amount
 */
export function getReserveTier(withdrawalAmount: number) {
  if (withdrawalAmount <= 0) return { tier: 0, reserve: 0, upperBound: 0 }
  const tier = Math.ceil(withdrawalAmount / 5)
  return { tier, reserve: tier * 2, upperBound: tier * 5 }
}

/**
 * Calculate total deduction (withdrawal + reserve) for a cashout
 */
export function calculateTotalDeduction(withdrawalAmount: number): number {
  return withdrawalAmount + calculateReserve(withdrawalAmount)
}
