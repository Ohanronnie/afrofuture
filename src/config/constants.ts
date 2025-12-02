import type { TicketInfo, InstallmentSchedule } from "../types/session.js";
import { env } from "./env.js";

// Ticket pricing
export const TICKETS: Record<"GA" | "VIP", TicketInfo> = {
  GA: {
    name: "Wave 1: GA",
    price: env.gaPrice,
    description: "General Admission (Access to main festival zones)",
  },
  VIP: {
    name: "Wave 1: VIP",
    price: env.vipPrice,
    description: "VIP Admission (Exclusive VIP section + VIP entry lanes)",
  },
};

// Installment plans
export const INSTALLMENT_PLANS: Record<"GA" | "VIP", InstallmentSchedule> = {
  GA: {
    A: [367.5, 275.63, 275.62],
    B: [459.38, 459.37],
  },
  VIP: {
    A: [647.0, 485.25, 485.25],
    B: [808.75, 808.75],
  },
};

// Event configuration
export const EVENT_CONFIG = {
  installmentDeadline: new Date(env.installmentDeadline),
  eventDates: env.eventDates,
  eventLocation: env.eventLocation,
  eventName: env.eventName,
};

// Support configuration
export const SUPPORT_INFO = {
  phone: env.supportPhone,
  email: env.supportEmail,
};

// Session states
export const SESSION_STATES = {
  WELCOME: "WELCOME",
  MAIN_MENU: "MAIN_MENU",
  SELECT_TICKET: "SELECT_TICKET",
  SELECT_PAYMENT_TYPE: "SELECT_PAYMENT_TYPE",
  SELECT_INSTALLMENT_PLAN: "SELECT_INSTALLMENT_PLAN",
  AWAITING_EMAIL: "AWAITING_EMAIL",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  WALLET_TRANSFER: "WALLET_TRANSFER",
} as const;
