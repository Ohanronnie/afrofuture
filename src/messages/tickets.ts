import { TICKETS } from "../config/constants.js";
import type { TicketType } from "../types/session.js";

export function getTicketSelectionMessage(): string {
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

How would you like to pay?

1️⃣ Pay in Full
2️⃣ Pay in Installments

Reply *1* or *2*.`;
}
