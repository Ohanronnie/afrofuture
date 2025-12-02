import type { Message } from "whatsapp-web.js";
import type { UserSession } from "../types/session.js";
import { validateWalletTransfer } from "../validators/input.js";
import { SESSION_STATES } from "../config/constants.js";
import { backend } from "../services/backend.js";
import {
  getWalletBalanceMessage,
  getWalletTransferConfirmationMessage,
  getEmptyWalletMessage,
} from "../messages/wallet.js";

export async function handleWalletBalance(
  message: Message,
  session: UserSession
): Promise<void> {
  const walletBalance = session.walletBalance || 0;

  if (walletBalance > 0) {
    const msg = getWalletBalanceMessage(walletBalance);
    await message.reply(msg);
    session.state = SESSION_STATES.WALLET_TRANSFER;
  } else {
    const msg = getEmptyWalletMessage();
    await message.reply(msg);
  }
}

export async function handleWalletTransfer(
  message: Message,
  userMessage: string,
  session: UserSession
): Promise<void> {
  const option = validateWalletTransfer(userMessage);

  const walletBalance = session.walletBalance || 0;
  let destination = "";

  switch (option) {
    case "1":
      destination = "AfroFuture 2026";
      break;
    case "2":
      destination = "AfroFuture Weekender";
      break;
    case "3":
      destination = "AfroFuture Foundation";
      break;
  }

  // Process the transfer
  await backend.processWalletTransfer(message.from, walletBalance, destination);

  const isDonation = option === "3";
  const msg = getWalletTransferConfirmationMessage(
    walletBalance,
    destination,
    isDonation
  );

  await message.reply(msg);

  // Clear wallet balance and reset state
  session.walletBalance = 0;
  session.state = SESSION_STATES.MAIN_MENU;
}
