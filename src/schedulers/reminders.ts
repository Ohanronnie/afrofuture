import type { Client } from "whatsapp-web.js";
import { User } from "../models/User.js";
import { ReminderTemplate } from "../models/ReminderTemplate.js";
import { ReminderLog } from "../models/ReminderLog.js";
import { backend } from "../services/backend.js";
import { daysUntil } from "../utils/date.js";
import { logError } from "../errors/errorHandler.js";
import {
  get5DayReminderMessage,
  get1DayReminderMessage,
} from "../messages/reminders.js";
import type { UserSession } from "../types/session.js";

/**
 * Replace template variables with actual values
 */
function replaceTemplateVariables(
  template: string,
  variables: {
    amount?: number;
    daysLeft?: number;
    paymentLink?: string;
    dueDate?: string;
    userName?: string;
    ticketType?: string;
  }
): string {
  let message = template;
  if (variables.amount !== undefined) {
    message = message.replace(/\{\{amount\}\}/g, variables.amount.toFixed(2));
  }
  if (variables.daysLeft !== undefined) {
    message = message.replace(
      /\{\{daysLeft\}\}/g,
      variables.daysLeft.toString()
    );
  }
  if (variables.paymentLink) {
    message = message.replace(/\{\{paymentLink\}\}/g, variables.paymentLink);
  }
  if (variables.dueDate) {
    message = message.replace(/\{\{dueDate\}\}/g, variables.dueDate);
  }
  if (variables.userName) {
    message = message.replace(/\{\{userName\}\}/g, variables.userName);
  }
  if (variables.ticketType) {
    message = message.replace(/\{\{ticketType\}\}/g, variables.ticketType);
  }
  return message;
}

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
      // Get active reminder templates for payment_due type
      const templates = await ReminderTemplate.find({
        type: "payment_due",
        isActive: true,
      }).sort({ triggerDays: -1 });

      // Try to use templates from database, fallback to hardcoded messages
      let reminderSent = false;

      for (const template of templates) {
        if (!template.triggerDays) continue;

        const reminderKey = `${template.triggerDays}DaySent`;
        const alreadySent =
          session.reminders?.[reminderKey as keyof typeof session.reminders];

        if (daysLeft === template.triggerDays && !alreadySent) {
          try {
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

            const variables = {
              amount: session.remainingBalance,
              daysLeft,
              paymentLink,
              dueDate: session.nextDueDate || "",
              userName: user.name,
              ticketType: session.ticketType || "",
            };

            const msg = replaceTemplateVariables(
              template.messageTemplate,
              variables
            );
            await client.sendMessage(chatId, msg);

            // Log reminder
            await ReminderLog.create({
              templateId: template._id,
              templateName: template.name,
              chatId,
              userName: user.name,
              message: msg,
              status: "sent",
              triggerType: "automatic",
              triggerDays: template.triggerDays,
            });

            // Mark as sent
            if (!session.reminders) {
              session.reminders = {};
            }
            (session.reminders as any)[reminderKey] = true;
            user.session = session;
            user.markModified("session");
            await user.save();

            console.log(
              `[REMINDER] ${template.triggerDays}-day reminder sent to ${chatId} (template: ${template.name})`
            );
            reminderSent = true;
            break;
          } catch (error) {
            logError(
              error,
              `sending ${template.triggerDays}-day reminder to ${chatId}`
            );
            await ReminderLog.create({
              templateId: template._id,
              templateName: template.name,
              chatId,
              userName: user.name,
              message: "",
              status: "failed",
              errorMessage:
                error instanceof Error ? error.message : "Unknown error",
              triggerType: "automatic",
              triggerDays: template.triggerDays,
            });
          }
        }
      }

      // Fallback to hardcoded messages if no templates found
      if (!reminderSent) {
        // 5-day reminder (fallback)
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

          await ReminderLog.create({
            chatId,
            userName: user.name,
            message: msg,
            status: "sent",
            triggerType: "automatic",
            triggerDays: 5,
          });

          session.reminders.fiveDaySent = true;
          user.session = session;
          user.markModified("session");
          await user.save();

          console.log(`[REMINDER] 5-day reminder sent to ${chatId} (fallback)`);
        }

        // 1-day reminder (fallback)
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

          await ReminderLog.create({
            chatId,
            userName: user.name,
            message: msg,
            status: "sent",
            triggerType: "automatic",
            triggerDays: 1,
          });

          session.reminders.oneDaySent = true;
          user.session = session;
          user.markModified("session");
          await user.save();

          console.log(`[REMINDER] 1-day reminder sent to ${chatId} (fallback)`);
        }
      }
    } catch (error) {
      logError(error, `sending reminder to ${chatId}`);
    }
  }
}
