import type { Client } from "whatsapp-web.js";
import { User } from "../models/User.js";
import { backend } from "../services/backend.js";
import { daysUntil } from "../utils/date.js";
import { logError } from "../errors/errorHandler.js";
import {
  get5DayReminderMessage,
  get1DayReminderMessage,
} from "../messages/reminders.js";
import type { UserSession } from "../types/session.js";

export async function checkReminders(client: Client): Promise<void> {
  console.log("[SCHEDULER] Checking for payment reminders...");

  const users = await User.find({});

  for (const user of users) {
    const chatId = user.chatId;
    const session = user.session as UserSession;

    // Skip if no pending payments or already has ticket
    if (
      !session.nextDueDateISO ||
      session.ticketId ||
      !session.remainingBalance ||
      session.remainingBalance <= 0
    ) {
      continue;
    }

    const daysLeft = daysUntil(session.nextDueDateISO);

    // Initialize reminders object if not exists
    if (!session.reminders) {
      session.reminders = {};
    }

    try {
      // 5-day reminder
      if (daysLeft <= 5 && daysLeft > 1 && !session.reminders.fiveDaySent) {
        const { paymentLink } = await backend.generatePaymentLink(
          session.remainingBalance,
          chatId,
          chatId,
          {
            ticketType: session.ticketType!,
            paymentType: "installment",
            installmentNumber: session.installmentNumber || 1,
          }
        );

        const msg = get5DayReminderMessage(
          session.remainingBalance,
          daysLeft,
          paymentLink
        );

        await client.sendMessage(chatId, msg);

        session.reminders.fiveDaySent = true;
        user.session = session;
        user.markModified("session");
        await user.save();

        console.log(`[REMINDER] 5-day reminder sent to ${chatId}`);
      }

      // 1-day reminder
      if (daysLeft === 1 && !session.reminders.oneDaySent) {
        const { paymentLink } = await backend.generatePaymentLink(
          session.remainingBalance,
          chatId,
          chatId,
          {
            ticketType: session.ticketType!,
            paymentType: "installment",
            installmentNumber: session.installmentNumber || 1,
          }
        );

        const msg = get1DayReminderMessage(
          session.remainingBalance,
          paymentLink,
          session.nextDueDate!
        );

        await client.sendMessage(chatId, msg);

        session.reminders.oneDaySent = true;
        user.session = session;
        user.markModified("session");
        await user.save();

        console.log(`[REMINDER] 1-day reminder sent to ${chatId}`);
      }
    } catch (error) {
      logError(error, `sending reminder to ${chatId}`);
    }
  }
}
