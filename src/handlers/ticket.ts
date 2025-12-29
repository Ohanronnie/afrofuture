import type { Message } from "whatsapp-web.js";
import type { UserSession } from "../types/session.js";
import { validateTicketType } from "../validators/input.js";
import { SESSION_STATES, TICKETS } from "../config/constants.js";
import {
  getTicketSelectionMessage,
  getTicketConfirmationMessage,
} from "../messages/tickets.js";
import { isVIPOutOfStock } from "../utils/ticketAvailability.js";

export async function showTicketTypes(message: Message): Promise<void> {
  const msg = await getTicketSelectionMessage();
  await message.reply(msg);
}

export async function handleTicketSelection(
  message: Message,
  userMessage: string,
  session: UserSession
): Promise<void> {
  const normalized = userMessage.toLowerCase().trim();

  // Check for VIP selection first (before validation) if VIP is out of stock
  const vipOutOfStock = await isVIPOutOfStock();
  if (vipOutOfStock && (normalized === "b" || normalized === "vip")) {
    await message.reply(
      "❌ *VIP tickets are currently out of stock.*\n\nPlease select *A* for GA tickets, or type *menu* to return to the main menu."
    );
    return; // Don't proceed with VIP selection
  }

  // Validate ticket type (will throw error for invalid input)
  const ticketType = validateTicketType(userMessage, vipOutOfStock);

  session.ticketType = ticketType;
  session.totalPrice = TICKETS[ticketType].price;
  session.paymentType = "full";

  const msg = getTicketConfirmationMessage(ticketType);
  await message.reply(msg);

  session.state = SESSION_STATES.AWAITING_EMAIL;
}
