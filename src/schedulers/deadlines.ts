import type { Client } from "whatsapp-web.js";
import { storage } from "../services/storage.js";
import { backend } from "../services/backend.js";
import { calculateEligibleTier } from "../utils/tier.js";
import { EVENT_CONFIG, TICKETS, SESSION_STATES } from "../config/constants.js";
import { logError } from "../errors/errorHandler.js";
import {
  getDeadlineMissedWithDowngradeMessage,
  getDeadlineMissedFullRolloverMessage,
} from "../messages/reminders.js";

export async function checkDeadlines(client: Client): Promise<void> {
  console.log("[SCHEDULER] Checking for missed deadlines...");

  const now = new Date();
  const deadline = EVENT_CONFIG.installmentDeadline;

  // Only run on Dec 14 or after
  if (now <= deadline) {
    return;
  }

  const sessions = storage.getAll();

  for (const [chatId, session] of sessions.entries()) {
    // Skip if already has ticket or already processed
    if (session.ticketId || session.walletBalance !== undefined) {
      continue;
    }

    // Check if user has pending payments
    if (
      session.amountPaid &&
      session.amountPaid > 0 &&
      session.remainingBalance &&
      session.remainingBalance > 0
    ) {
      const originalTicket = TICKETS[session.ticketType!];
      const eligibleTier = calculateEligibleTier(
        session.ticketType!,
        session.amountPaid
      );

      try {
        if (eligibleTier) {
          // User qualifies for a downgraded tier
          const downgradedTicket = TICKETS[eligibleTier];
          const walletAmount = session.amountPaid - downgradedTicket.price;

          session.walletBalance = walletAmount;

          const msg = getDeadlineMissedWithDowngradeMessage(
            session.amountPaid,
            originalTicket.price,
            downgradedTicket.name,
            "PENDING_ADMIN_TICKET",
            walletAmount
          );

          await client.sendMessage(chatId, msg);

          session.state = SESSION_STATES.WALLET_TRANSFER;
          storage.set(chatId, session);

          console.log(`[DEADLINE] Downgraded ${chatId} to ${eligibleTier}`);
        } else {
          // Full rollover to wallet
          session.walletBalance = session.amountPaid;

          const msg = getDeadlineMissedFullRolloverMessage(
            session.amountPaid,
            originalTicket.price
          );

          await client.sendMessage(chatId, msg);

          session.state = SESSION_STATES.WALLET_TRANSFER;
          storage.set(chatId, session);

          console.log(`[DEADLINE] Full rollover for ${chatId}`);
        }
      } catch (error) {
        logError(error, `processing deadline for ${chatId}`);
      }
    }
  }
}
