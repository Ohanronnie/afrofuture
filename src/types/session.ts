// User session types
export interface UserSession {
  state: string;
  ticketType?: "GA" | "VIP";
  paymentType?: "full" | "installment";
  installmentPlan?: "A" | "B" | "C";
  email?: string;
  ticketId?: string;
  amountPaid?: number;
  totalPrice?: number;
  remainingBalance?: number;
  nextDueDate?: string;
  nextDueDateISO?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  walletBalance?: number;
  reminders?: {
    fiveDaySent?: boolean;
    oneDaySent?: boolean;
  };
}

export type TicketType = "GA" | "VIP";
export type PaymentType = "full" | "installment";
export type InstallmentPlan = "A" | "B" | "C";
export type SessionState =
  | "WELCOME"
  | "MAIN_MENU"
  | "SELECT_TICKET"
  | "SELECT_PAYMENT_TYPE"
  | "SELECT_INSTALLMENT_PLAN"
  | "AWAITING_EMAIL"
  | "AWAITING_PAYMENT"
  | "WALLET_TRANSFER";

export interface TicketInfo {
  name: string;
  price: number;
  description: string;
}

export interface InstallmentSchedule {
  A: number[];
  B: number[];
}
