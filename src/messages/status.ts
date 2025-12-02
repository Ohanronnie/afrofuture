import { EVENT_CONFIG } from "../config/constants.js";
import type { TicketType } from "../types/session.js";

export function getCompletedPaymentStatusMessage(
  ticketName: string,
  ticketId: string,
  amountPaid: number
): string {
  return `✅ *Payment Status: COMPLETED*

🎫 Ticket: ${ticketName}
🆔 Ticket ID: #${ticketId}
💰 Paid: GH₵${amountPaid.toFixed(2)}
📅 Event: ${EVENT_CONFIG.eventDates}

Your QR ticket has been sent to this chat. 🎉`;
}

export function getInProgressPaymentStatusMessage(
  ticketName: string,
  amountPaid: number,
  balance: number,
  nextDueDate: string,
  paymentLink: string
): string {
  return `💳 *Payment Status: IN PROGRESS*

🎫 Ticket: ${ticketName}
✅ Paid: GH₵${amountPaid.toFixed(2)}
💵 Balance: GH₵${balance.toFixed(2)}
📅 Next Payment Due: ${nextDueDate}

Pay now: ${paymentLink}`;
}

export function getNoTicketsMessage(): string {
  return "You don't have any tickets yet.\n\nType *1* to buy a ticket!";
}

export function getContinueInstallmentMessage(
  ticketName: string,
  remainingBalance: number,
  dueDate: string,
  paymentLink: string
): string {
  return `💳 *Continue Your Payment*

🎫 Ticket: ${ticketName}
💵 Remaining Balance: GH₵${remainingBalance.toFixed(2)}
📅 Due Date: ${dueDate}

Click to pay:
${paymentLink}`;
}

export function getNoPendingPaymentsMessage(): string {
  return "You don't have any pending installment payments.\n\nType *menu* to see all options.";
}
