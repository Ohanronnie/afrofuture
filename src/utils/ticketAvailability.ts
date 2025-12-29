import { Payment } from "../models/Payment.js";

/**
 * Additional VIP tickets available from this point forward (hardcoded)
 * This is backend-only and not exposed to users
 *
 * This represents 50 MORE tickets that can be sold from the baseline count
 */
const VIP_ADDITIONAL_AVAILABLE = 50;

/**
 * Baseline count of VIP tickets already sold before this feature was implemented
 * This will be set automatically on first run based on current sales
 * Set to null initially to auto-detect, or set a specific number if you know the exact baseline
 */
let VIP_BASELINE_COUNT: number | null = null;

/**
 * Initialize the baseline count (called once on startup or first check)
 * This sets the baseline to current sales, allowing 50 more to be sold
 */
async function initializeBaseline(): Promise<void> {
  if (VIP_BASELINE_COUNT === null) {
    try {
      const currentVIPSold = await Payment.countDocuments({
        ticketType: "VIP",
        status: "success",
      });

      VIP_BASELINE_COUNT = currentVIPSold;
      console.log(
        `[TICKET_AVAILABILITY] Baseline initialized: ${VIP_BASELINE_COUNT} VIP tickets already sold. ${VIP_ADDITIONAL_AVAILABLE} more available.`
      );
    } catch (error) {
      console.error(
        "[TICKET_AVAILABILITY] Error initializing baseline:",
        error
      );
      // Default to 0 if we can't get the count
      VIP_BASELINE_COUNT = 0;
    }
  }
}

/**
 * Check if VIP tickets are out of stock
 * Returns true if VIP tickets are out of stock, false if available
 *
 * Logic: Count current VIP sales, subtract baseline, check if >= 50 additional sold
 */
export async function isVIPOutOfStock(): Promise<boolean> {
  try {
    // Initialize baseline on first call
    await initializeBaseline();

    // Count current successful VIP ticket payments
    const currentVIPSold = await Payment.countDocuments({
      ticketType: "VIP",
      status: "success",
    });

    // Calculate how many NEW tickets have been sold since baseline
    const newVIPSold = currentVIPSold - (VIP_BASELINE_COUNT || 0);

    // Check if we've sold 50 additional tickets
    const isOutOfStock = newVIPSold >= VIP_ADDITIONAL_AVAILABLE;

    if (isOutOfStock) {
      console.log(
        `[TICKET_AVAILABILITY] VIP tickets out of stock: ${newVIPSold}/${VIP_ADDITIONAL_AVAILABLE} new tickets sold (${currentVIPSold} total, baseline: ${VIP_BASELINE_COUNT})`
      );
    } else {
      const remaining = VIP_ADDITIONAL_AVAILABLE - newVIPSold;
      console.log(
        `[TICKET_AVAILABILITY] VIP tickets available: ${remaining} remaining (${newVIPSold}/${VIP_ADDITIONAL_AVAILABLE} new sold, ${currentVIPSold} total, baseline: ${VIP_BASELINE_COUNT})`
      );
    }

    return isOutOfStock;
  } catch (error) {
    console.error(
      "[TICKET_AVAILABILITY] Error checking VIP availability:",
      error
    );
    // On error, default to out of stock for safety
    return true;
  }
}

/**
 * Get remaining VIP tickets count (backend-only, not exposed to users)
 * Returns how many of the 50 additional tickets are still available
 */
export async function getRemainingVIPTickets(): Promise<number> {
  try {
    // Initialize baseline on first call
    await initializeBaseline();

    const currentVIPSold = await Payment.countDocuments({
      ticketType: "VIP",
      status: "success",
    });

    const newVIPSold = currentVIPSold - (VIP_BASELINE_COUNT || 0);
    return Math.max(0, VIP_ADDITIONAL_AVAILABLE - newVIPSold);
  } catch (error) {
    console.error(
      "[TICKET_AVAILABILITY] Error getting remaining VIP tickets:",
      error
    );
    return 0;
  }
}
