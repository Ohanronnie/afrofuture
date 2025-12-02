import type { Message } from "whatsapp-web.js";
import type { UserSession } from "../types/session.js";
import {
  validateInstallmentPlan,
  validateSessionForPayment,
} from "../validators/input.js";
import {
  SESSION_STATES,
  TICKETS,
  INSTALLMENT_PLANS,
} from "../config/constants.js";
import { backend } from "../services/backend.js";
import { updateSession, getSession } from "../utils/session.js";
import {
  getInstallmentPlansMessage,
  getCustomPlanMessage,
  getInstallmentPaymentMessage,
  getInstallmentConfirmationMessage,
} from "../messages/payments.js";
import {
  getContinueInstallmentMessage,
  getNoPendingPaymentsMessage,
} from "../messages/status.js";

export async function showInstallmentPlans(
  message: Message,
  session: UserSession
): Promise<void> {
  validateSessionForPayment(session);

  const msg = getInstallmentPlansMessage(session.ticketType!);
  await message.reply(msg);
}

export async function handleInstallmentPlanSelection(
  message: Message,
  chatId: string,
  userMessage: string,
  session: UserSession
): Promise<void> {
  validateSessionForPayment(session);

  const plan = validateInstallmentPlan(userMessage);
  session.installmentPlan = plan;

  if (plan === "C") {
    const msg = getCustomPlanMessage();
    await message.reply(msg);
    session.state = SESSION_STATES.MAIN_MENU;
    return;
  }

  // Get first installment amount
  const ticketType = session.ticketType!;
  const plans = INSTALLMENT_PLANS[ticketType];
  const selectedPlan = plan === "A" ? plans.A : plans.B;
  const firstPayment = selectedPlan[0]!;

  session.installmentNumber = 1;
  session.totalInstallments = selectedPlan.length;
  session.amountPaid = 0;
  session.totalPrice = TICKETS[ticketType].price;

  const { paymentLink } = await backend.generatePaymentLink(
    firstPayment,
    chatId,
    chatId,
    {
      ticketType: session.ticketType!,
      paymentType: "installment",
      installmentNumber: 1,
    }
  );
  const msg = getInstallmentPaymentMessage(plan, firstPayment, paymentLink);

  await message.reply(msg);
  session.state = SESSION_STATES.AWAITING_PAYMENT;
}

export async function handleContinueInstallment(
  message: Message,
  session: UserSession
): Promise<void> {
  if (
    !session.ticketId &&
    session.remainingBalance &&
    session.remainingBalance > 0
  ) {
    const ticket = TICKETS[session.ticketType!];
    const { paymentLink } = await backend.generatePaymentLink(
      session.remainingBalance,
      message.from,
      message.from,
      {
        ticketType: session.ticketType!,
        paymentType: "installment",
        installmentNumber: session.installmentNumber || 1,
      }
    );

    const msg = getContinueInstallmentMessage(
      ticket.name,
      session.remainingBalance,
      session.nextDueDate!,
      paymentLink
    );

    await message.reply(msg);
  } else {
    const msg = getNoPendingPaymentsMessage();
    await message.reply(msg);
  }
}
