import type { Message } from "whatsapp-web.js";
import type { UserSession } from "../types/session.js";
import { TICKETS } from "../config/constants.js";
import { backend } from "../services/backend.js";
import {
  getCompletedPaymentStatusMessage,
  getInProgressPaymentStatusMessage,
  getNoTicketsMessage,
} from "../messages/status.js";

export async function handleCheckPaymentStatus(
  message: Message,
  session: UserSession
): Promise<void> {
  if (session.ticketId) {
    // Fully paid
    const ticket = TICKETS[session.ticketType!];
    const paidAmount = session.totalPrice ? session.totalPrice : ticket.price;

    const msg = getCompletedPaymentStatusMessage(
      ticket.name,
      session.ticketId,
      paidAmount
    );

    await message.reply(msg);
  } else if (session.amountPaid && session.amountPaid > 0) {
    // Legacy partial/installment-style payments are no longer supported
    await message.reply(
      "💳 We see a payment in progress on your account.\n\nInstallment plans are no longer supported via this bot. Please contact support if you need help completing your payment."
    );
  } else {
    const msg = getNoTicketsMessage();
    await message.reply(msg);
  }
}
