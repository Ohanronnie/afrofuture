import type { TicketType } from "../types/session.js";
import { TICKETS } from "../config/constants.js";

// Calculate eligible ticket tier based on amount paid
export function calculateEligibleTier(
  originalTier: TicketType,
  amountPaid: number
): TicketType | null {
  if (originalTier === "VIP" && amountPaid >= TICKETS.GA.price) {
    return "GA"; // Downgrade to GA if they paid enough for GA
  }
  if (originalTier === "GA" && amountPaid >= TICKETS.GA.price) {
    return "GA"; // Keep GA if fully paid
  }
  return null; // No ticket if insufficient payment
}
