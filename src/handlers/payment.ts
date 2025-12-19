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
import { Coupon } from "../models/Coupon.js";
import { resetToMainMenu } from "../utils/session.js";
import { getWelcomeMessage } from "../messages/welcome.js";

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
    throw error;
  }

  const chatId = message.from;

  // Save email on user record
  await User.findOneAndUpdate(
    { chatId },
    { $set: { email } },
    { new: true }
  );

  session.email = email;
  session.state = SESSION_STATES.AWAITING_COUPON_ANSWER;

  await message.reply(
    `✅ Got it! We'll use *${email}* for your receipt and ticket.\n\n🎟️ Do you have a *coupon code*? (Reply *Yes* or *No*)`
  );
}

export async function handleCouponAnswer(
  message: Message,
  userMessage: string,
  session: UserSession
): Promise<void> {
  const msg = userMessage.toLowerCase();

  if (msg === "yes" || msg === "y") {
    session.state = SESSION_STATES.AWAITING_COUPON_CODE;
    await message.reply("🆒 Please enter your *coupon code*: ");
  } else if (msg === "no" || msg === "n") {
    await generatePayment(message, session);
  } else {
    await message.reply("❓ Please reply with *Yes* or *No*.");
  }
}

export async function handleCouponCode(
  message: Message,
  userMessage: string,
  session: UserSession
): Promise<void> {
  const code = userMessage.toUpperCase();
  const coupon = await Coupon.findOne({ code, isActive: true });

  if (!coupon) {
    session.state = SESSION_STATES.AWAITING_CONTINUE_ANSWER;
    await message.reply(
      "❌ Coupon not found or expired. Would you like to *continue* with the original price? (Reply *Yes* or *No*)"
    );
    return;
  }

  // Verify usage and expiry
  if (coupon.maxUsage !== null && coupon.usageCount >= coupon.maxUsage) {
    session.state = SESSION_STATES.AWAITING_CONTINUE_ANSWER;
    await message.reply(
      "⚠️ This coupon has reached its maximum usage limit. Would you like to *continue* with the original price? (Reply *Yes* or *No*)"
    );
    return;
  }

  if (coupon.expiryDate && new Date() > coupon.expiryDate) {
    session.state = SESSION_STATES.AWAITING_CONTINUE_ANSWER;
    await message.reply(
      "⚠️ This coupon has expired. Would you like to *continue* with the original price? (Reply *Yes* or *No*)"
    );
    return;
  }

  // Apply discount
  const ticket = TICKETS[session.ticketType!];
  const originalPrice = ticket.price;
  let discountedPrice = originalPrice;

  if (coupon.discountType === "percentage") {
    discountedPrice = originalPrice * (1 - coupon.discountValue / 100);
  } else {
    discountedPrice = Math.max(0, originalPrice - coupon.discountValue);
  }

  session.appliedCoupon = code;
  session.originalPrice = originalPrice;
  session.discountedPrice = discountedPrice;

  await message.reply(
    `🎉 Coupon applied successfully! You've received a discount.\n\n` +
      `Original Price: GHS ${originalPrice}\n` +
      `*Discounted Price: GHS ${discountedPrice.toFixed(2)}*`
  );

  await generatePayment(message, session);
}

export async function handleContinueAnswer(
  message: Message,
  userMessage: string,
  session: UserSession
): Promise<void> {
  const msg = userMessage.toLowerCase();

  if (msg === "yes" || msg === "y") {
    await generatePayment(message, session);
  } else if (msg === "no" || msg === "n") {
    await resetToMainMenu(message.from);
    await message.reply(getWelcomeMessage(session.state)); // This might need userName which we don't have here easily, but let's just go back
    // Alternatively, just send a simple back message
    await message.reply("🔄 Returning to main menu...");
  } else {
    await message.reply("❓ Please reply with *Yes* or *No*.");
  }
}

async function generatePayment(
  message: Message,
  session: UserSession
): Promise<void> {
  const chatId = message.from;
  const ticket = TICKETS[session.ticketType!];
  const price = session.discountedPrice !== undefined ? session.discountedPrice : ticket.price;

  const { paymentLink } = await backend.generatePaymentLink(
    price,
    chatId,
    chatId,
    {
      ticketType: session.ticketType!,
      paymentType: session.paymentType || "full",
      coupon: session.appliedCoupon,
    }
  );

  const msg = getFullPaymentMessage(paymentLink);
  await message.reply(msg);

  session.state = SESSION_STATES.AWAITING_PAYMENT;
}
