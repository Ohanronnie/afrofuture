import { EVENT_CONFIG } from "../config/constants.js";

export function get5DayReminderMessage(
  amount: number,
  daysLeft: number,
  paymentLink: string
): string {
  return `🔔 Hi there — your next AfroFuture payment of GH₵${amount.toFixed(
    2
  )} is due in ${daysLeft} days.

Pay now: ${paymentLink}

_Don't miss out on your spot at ${EVENT_CONFIG.eventLocation}!_`;
}

export function get1DayReminderMessage(
  amount: number,
  paymentLink: string,
  dueDate: string
): string {
  return `⏰ *Reminder — final call!*

GH₵${amount.toFixed(2)} due *tomorrow*.

Pay to keep your ticket confirmed: ${paymentLink}

⚠️ _Final deadline: ${dueDate}_`;
}

export function getDeadlineMissedWithDowngradeMessage(
  amountPaid: number,
  originalPrice: number,
  downgradedTicketName: string,
  ticketId: string,
  walletAmount: number
): string {
  return `Hi there, your installment window closed.

You paid GH₵${amountPaid.toFixed(2)} of GH₵${originalPrice.toFixed(2)}.

✅ You qualify for *${downgradedTicketName}*
🆔 Ticket ID: #${ticketId}

💰 Your remaining balance GH₵${walletAmount.toFixed(
    2
  )} has been added to your AfroFuture Wallet.

*Options:*
1️⃣ Transfer to AfroFuture 2026
2️⃣ Use for AfroFuture Weekender
3️⃣ Donate to AfroFuture Foundation

Reply 1, 2, or 3 to choose.`;
}

export function getDeadlineMissedFullRolloverMessage(
  amountPaid: number,
  originalPrice: number
): string {
  return `Hi there, your installment window closed.

You paid GH₵${amountPaid.toFixed(2)} of GH₵${originalPrice.toFixed(2)}.

💰 Your balance has been moved to your AfroFuture Wallet.

*Choose how to use it:*
1️⃣ AfroFuture 2026
2️⃣ AfroFuture Weekender
3️⃣ Donate to AfroFuture Foundation

Reply 1, 2, or 3.`;
}
