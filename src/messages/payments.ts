import {
  INSTALLMENT_PLANS,
  TICKETS,
  EVENT_CONFIG,
} from "../config/constants.js";
import type { TicketType } from "../types/session.js";

export function getFullPaymentMessage(paymentLink: string): string {
  return `🎫 *Perfect — let's secure your spot!*

Click to pay:
${paymentLink}

Once payment is confirmed, you will receive your:
✅ Payment confirmation
🎫 Ticket ID
🔳 Official QR Code Ticket (sent here in WhatsApp)

_The payment link is valid for 24 hours._`;
}

export function getInstallmentPlansMessage(ticketType: TicketType): string {
  const plans = INSTALLMENT_PLANS[ticketType];

  return `💳 *Choose a payment plan:*

🅰️ *Plan A — 3 Payments*
   • 40% now: GH₵${plans.A[0]}
   • 30% in 3 weeks: GH₵${plans.A[1]}
   • 30% by Dec 13, 2025: GH₵${plans.A[2]}

🅱️ *Plan B — 2 Payments*
   • 50% now: GH₵${plans.B[0]}
   • 50% by Dec 13, 2025: GH₵${plans.B[1]}

🅾️ *Plan C — Custom*
   • Choose any schedule (Final deadline: Dec 13, 2025)

Reply *A*, *B*, or *C*.`;
}

export function getPaymentConfirmationMessage(
  ticketName: string,
  ticketId: string
): string {
  return `✅ *Payment received successfully!*

Your ticket is confirmed! 🎉

🎫 Ticket: ${ticketName}
🆔 Ticket ID: #${ticketId}
📅 Event: ${EVENT_CONFIG.eventDates} — ${EVENT_CONFIG.eventLocation}

Your QR Code will be delivered shortly...`;
}

export function getInstallmentPaymentMessage(
  plan: string,
  firstPayment: number,
  paymentLink: string
): string {
  return `💳 *Payment Plan ${plan} Selected*

First payment: GH₵${firstPayment}

Click to pay:
${paymentLink}

_You'll receive a confirmation once payment is processed._`;
}

export function getInstallmentConfirmationMessage(
  ticketName: string,
  installmentNumber: number,
  totalInstallments: number,
  remainingBalance: number,
  nextDueDate: string,
  isFullyPaid: boolean
): string {
  const baseMessage = `✅ *Payment received!*

🎫 Ticket: ${ticketName}
💰 Installment: ${installmentNumber}/${totalInstallments}
💵 Remaining Balance: GH₵${remainingBalance.toFixed(2)}
📅 Next Due Date: ${nextDueDate}

`;

  if (isFullyPaid) {
    return (
      baseMessage + "\n🎉 *Fully Paid!* Your QR ticket will be sent shortly."
    );
  }

  return (
    baseMessage + "\n_A reminder will be sent 5 days before your next payment._"
  );
}

export function getCustomPlanMessage(): string {
  return `📞 *Custom Plan Selected*

Our team will contact you within 24 hours to arrange a custom payment schedule.

Support: +233 55 000 0000
Email: support@afrofuture.com`;
}
