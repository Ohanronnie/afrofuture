import { TICKETS } from "../config/constants.js";
import type { TicketType } from "../types/session.js";
import { isVIPOutOfStock } from "../utils/ticketAvailability.js";

export async function getTicketSelectionMessage(): Promise<string> {
  // Check VIP availability dynamically
  const vipOutOfStock = await isVIPOutOfStock();

  if (vipOutOfStock) {
    // Only show GA when VIP is out of stock
    return `🎟️ *Choose your ticket type* (Both Days Included):

*A.* ${TICKETS.GA.name} — GH₵${TICKETS.GA.price}
   ${TICKETS.GA.description}

⚠️ *VIP tickets are currently out of stock.*

Reply with *A* to select.`;
  }

  // If VIP is available, show both options
  return `🎟️ *Choose your ticket type* (Both Days Included):

*A.* ${TICKETS.GA.name} — GH₵${TICKETS.GA.price}
   ${TICKETS.GA.description}

*B.* ${TICKETS.VIP.name} — GH₵${TICKETS.VIP.price}
   ${TICKETS.VIP.description}

Reply with *A* or *B* to select.`;
}

export function getTicketConfirmationMessage(ticketType: TicketType): string {
  const ticket = TICKETS[ticketType];
  return `✅ You selected *${ticket.name}* — GH₵${ticket.price}

📧 Before we generate your payment link, please reply with your *email address* (e.g. name@example.com). We'll send your receipt and ticket details there.`;
}
