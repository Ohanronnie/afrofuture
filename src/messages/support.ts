import { SUPPORT_INFO } from "../config/constants.js";

export function getHelpMessage(): string {
  return `💬 *Need assistance? Our team is here to help!*

📞 Phone: ${SUPPORT_INFO.phone}
📧 Email: ${SUPPORT_INFO.email}

*Common Questions:*

❓ How do I get my ticket?
   → After payment, your QR code will be sent to this chat

❓ Can I transfer my ticket?
   → Contact support for ticket transfers

❓ What if I miss an installment?
   → Your balance moves to your AfroFuture Wallet

❓ Refund policy?
   → Contact support for refund requests

Type *menu* to return to the main menu.`;
}
