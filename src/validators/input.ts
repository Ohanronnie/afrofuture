import { ValidationError } from "../errors/AppError.js";
import type { TicketType, InstallmentPlan } from "../types/session.js";

// Validate ticket type selection
export function validateTicketType(
  input: string,
  vipOutOfStock: boolean = false
): TicketType {
  const normalized = input.toLowerCase().trim();

  if (normalized === "a") return "GA";
  if (normalized === "b") {
    if (vipOutOfStock) {
      throw new ValidationError(
        "❌ *VIP tickets are currently out of stock.*\n\nPlease select *A* for GA tickets, or type *menu* to return to the main menu."
      );
    }
    return "VIP";
  }

  // Dynamic error message based on VIP availability
  const errorMessage = vipOutOfStock
    ? "Please reply with *A* to select GA tickets."
    : "Please reply with *A* for GA or *B* for VIP.";

  throw new ValidationError(errorMessage);
}

// Validate payment type selection (full payment only)
export function validatePaymentType(input: string): "full" {
  const normalized = input.trim();

  if (normalized === "1") return "full";

  throw new ValidationError("Please reply with *1* to pay in full.");
}

// Validate installment plan selection
export function validateInstallmentPlan(input: string): InstallmentPlan {
  const normalized = input.toLowerCase().trim();

  if (normalized === "a") return "A";
  if (normalized === "b") return "B";
  if (normalized === "c") return "C";

  throw new ValidationError(
    "Please reply with *A*, *B*, or *C* to select a plan."
  );
}

// Validate main menu selection
export function validateMenuOption(input: string): string {
  const normalized = input.trim();

  if (["1", "2", "3", "4"].includes(normalized)) {
    return normalized;
  }

  throw new ValidationError(
    "Please reply with a number 1-4 to select an option, or type *menu* to see options again."
  );
}

// Validate wallet transfer selection
export function validateWalletTransfer(input: string): string {
  const normalized = input.trim();

  if (["1", "2", "3"].includes(normalized)) {
    return normalized;
  }

  throw new ValidationError(
    "Please reply with *1*, *2*, or *3* to choose where to transfer your balance."
  );
}

// Validate email address (basic)
export function validateEmail(input: string): string {
  const trimmed = input.trim();

  // Very simple email pattern, just to catch obvious mistakes
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(trimmed)) {
    throw new ValidationError(
      "That doesn't look like a valid email. Please reply with an email like *name@example.com*."
    );
  }

  return trimmed.toLowerCase();
}

// Validate session has required fields
export function validateSessionForPayment(session: any): void {
  if (!session.ticketType) {
    throw new ValidationError(
      "Session error: No ticket type selected. Please start over by typing *menu*."
    );
  }

  if (!session.totalPrice) {
    throw new ValidationError(
      "Session error: No ticket price found. Please start over by typing *menu*."
    );
  }
}

// Validate amount is positive
export function validateAmount(amount: number): void {
  if (amount <= 0 || isNaN(amount)) {
    throw new ValidationError("Invalid amount. Please try again.");
  }
}

// Check if string is empty or whitespace
export function isEmptyString(input: string): boolean {
  return !input || input.trim().length === 0;
}

// Sanitize user input (basic)
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}
