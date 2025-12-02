import { EVENT_CONFIG } from "../config/constants.js";

export function getWelcomeMessage(userName: string): string {
  return `👋🏾 Hi ${userName}! Welcome to *${EVENT_CONFIG.eventName}* — Africa's biggest cultural celebration!

📍 *${EVENT_CONFIG.eventLocation}*
📅 *${EVENT_CONFIG.eventDates}*

What would you like to do today?

1️⃣ Buy a Ticket
2️⃣ Check My Payment Status
3️⃣ Transfer / Use My Wallet Balance
4️⃣ Help / Contact Support

_Please save this contact to receive your QR ticket, reminders & lineup announcements._`;
}
