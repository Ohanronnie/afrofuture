import type { Message } from "whatsapp-web.js";
import {
  getSession,
  updateSession,
  resetToMainMenu,
} from "../utils/session.js";
import { sanitizeInput } from "../validators/input.js";
import { SESSION_STATES } from "../config/constants.js";
import { getWelcomeMessage } from "../messages/welcome.js";
import { handleError } from "../errors/errorHandler.js";
import { handleMainMenu } from "./menu.js";
import { handleTicketSelection } from "./ticket.js";
import { handleEmailCollection } from "./payment.js";
import { handleInstallmentPlanSelection } from "./installment.js";
import { handleWalletTransfer } from "./wallet.js";

export async function handleMessage(
  message: Message,
  chatId: string,
  userName: string,
  userMessage: string
): Promise<void> {
  console.log(
    `[DEBUG] handleMessage called - chatId: ${chatId}, userName: ${userName}, message: ${userMessage}`
  );
  try {
    // Sanitize input
    console.log("[DEBUG] Sanitizing input...");
    const sanitized = sanitizeInput(userMessage);
    const msg = sanitized.toLowerCase();
    console.log(`[DEBUG] Sanitized message: ${msg}`);

    // Get session
    console.log("[DEBUG] Getting session...");
    const session = await getSession(chatId, userName);
    console.log(`[DEBUG] Session retrieved - state: ${session.state}`);

    // Handle menu command – always reset session to a clean main menu state
    if (msg === "menu" || msg === "start") {
      await resetToMainMenu(chatId);
      await sendWelcomeMessage(message, userName);
      return;
    }

    // If user is in initial welcome state, show menu but don't wipe existing data
    if (session.state === SESSION_STATES.WELCOME) {
      await sendWelcomeMessage(message, userName);
      await updateSession(chatId, { state: SESSION_STATES.MAIN_MENU });
      return;
    }

    // Route based on current state
    switch (session.state) {
      case SESSION_STATES.MAIN_MENU:
        await handleMainMenu(message, userName, msg, session);
        await updateSession(chatId, session);
        break;

      case SESSION_STATES.SELECT_TICKET:
        await handleTicketSelection(message, msg, session);
        await updateSession(chatId, session);
        break;

      case SESSION_STATES.AWAITING_EMAIL:
        await handleEmailCollection(message, userMessage, session);
        await updateSession(chatId, session);
        break;

      case SESSION_STATES.SELECT_INSTALLMENT_PLAN:
        await handleInstallmentPlanSelection(message, chatId, msg, session);
        await updateSession(chatId, session);
        break;

      case SESSION_STATES.AWAITING_PAYMENT:
        await message.reply(
          "⏳ Please complete your payment using the link provided. Once confirmed, you'll receive your ticket automatically."
        );
        break;

      case SESSION_STATES.WALLET_TRANSFER:
        await handleWalletTransfer(message, msg, session);
        await updateSession(chatId, session);
        break;

      default:
        console.log(
          `[DEBUG] Unknown state: ${session.state}, sending welcome message`
        );
        await sendWelcomeMessage(message, userName);
        await updateSession(chatId, { state: SESSION_STATES.MAIN_MENU });
    }
    console.log(`[DEBUG] handleMessage completed successfully`);
  } catch (error) {
    console.error(`[DEBUG] Error in handleMessage:`, error);
    console.error(`[DEBUG] Error stack:`, (error as Error).stack);
    await handleError(error, message, "handling message");
  }
}

async function sendWelcomeMessage(
  message: Message,
  userName: string
): Promise<void> {
  const msg = getWelcomeMessage(userName);
  await message.reply(msg);
}
