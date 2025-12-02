import type { Message } from "whatsapp-web.js";
import type { UserSession } from "../types/session.js";
import {
  validatePaymentType,
  validateSessionForPayment,
  validateEmail,
} from "../validators/input.js";
import { SESSION_STATES, TICKETS } from "../config/constants.js";
import { backend } from "../services/backend.js";
import { updateSession } from "../utils/session.js";
import { getFullPaymentMessage } from "../messages/payments.js";
import { User } from "../models/User.js";

export async function handlePaymentTypeSelection(
  message: Message,
  userMessage: string,
  session: UserSession
): Promise<void> {
  validateSessionForPayment(session);

  const paymentType = validatePaymentType(userMessage);
  const ticket = TICKETS[session.ticketType!];

  // Full payment only – first collect user's email before generating link
  session.paymentType = paymentType;
  session.state = SESSION_STATES.AWAITING_EMAIL;

  await message.reply(
    "📧 Before we generate your payment link, please reply with your *email address* (e.g. name@example.com). We'll send your receipt and ticket details there."
  );
}

// Handle collecting user's email before payment
export async function handleEmailCollection(
  message: Message,
  userMessage: string,
  session: UserSession
): Promise<void> {
  // Validate email format
  let email: string;
  try {
    email = validateEmail(userMessage);
  } catch (error) {
    // Bubble up to global error handler (it will reply with validation message)
    throw error;
  }

  const chatId = message.from;

  // Save email on user record
  await User.findOneAndUpdate(
    { chatId },
    {
      $set: {
        email,
      },
    },
    { new: true }
  );

  // Also keep in session for convenience
  session.email = email;

  const ticket = TICKETS[session.ticketType!];

  const { paymentLink } = await backend.generatePaymentLink(
    ticket.price,
    chatId,
    chatId,
    {
      ticketType: session.ticketType!,
      paymentType: session.paymentType || "full",
    }
  );

  const msg = getFullPaymentMessage(paymentLink);
  await message.reply(
    `✅ Got it! We'll use *${email}* for your receipt and ticket.\n\n${msg}`
  );

  session.state = SESSION_STATES.AWAITING_PAYMENT;
}
