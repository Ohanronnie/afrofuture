import type { Message } from "whatsapp-web.js";
import type { UserSession } from "../types/session.js";
import { validateTicketType } from "../validators/input.js";
import { SESSION_STATES, TICKETS } from "../config/constants.js";
import {
  getTicketSelectionMessage,
  getTicketConfirmationMessage,
} from "../messages/tickets.js";

export async function showTicketTypes(message: Message): Promise<void> {
  const msg = getTicketSelectionMessage();
  await message.reply(msg);
}

export async function handleTicketSelection(
  message: Message,
  userMessage: string,
  session: UserSession
): Promise<void> {
  const ticketType = validateTicketType(userMessage);

  session.ticketType = ticketType;
  session.totalPrice = TICKETS[ticketType].price;

  const msg = getTicketConfirmationMessage(ticketType);
  await message.reply(msg);

  session.state = SESSION_STATES.SELECT_PAYMENT_TYPE;
}
