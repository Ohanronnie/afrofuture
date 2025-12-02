import type { Message } from "whatsapp-web.js";
import type { UserSession } from "../types/session.js";
import { validateMenuOption } from "../validators/input.js";
import { SESSION_STATES } from "../config/constants.js";
import { showTicketTypes } from "./ticket.js";
import { handleCheckPaymentStatus } from "./status.js";
import { handleWalletBalance } from "./wallet.js";
import { showHelpSupport } from "./support.js";

export async function handleMainMenu(
  message: Message,
  userName: string,
  userMessage: string,
  session: UserSession
): Promise<void> {
  const option = validateMenuOption(userMessage);

  switch (option) {
    case "1":
      await showTicketTypes(message);
      session.state = SESSION_STATES.SELECT_TICKET;
      break;

    case "2":
      await handleCheckPaymentStatus(message, session);
      break;

    case "3":
      await handleWalletBalance(message, session);
      break;

    case "4":
      await showHelpSupport(message);
      session.state = SESSION_STATES.MAIN_MENU;
      break;
  }
}
