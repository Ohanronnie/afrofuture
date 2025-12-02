import type { Message } from "whatsapp-web.js";
import { AppError } from "./AppError.js";

// Error handler for message processing
export async function handleError(
  error: unknown,
  message: Message,
  context: string = "processing your request"
): Promise<void> {
  console.error(`[ERROR] ${context}:`, error);

  let userMessage =
    "Sorry, something went wrong. Please try again or contact support.";

  if (error instanceof AppError) {
    if (error.isOperational) {
      userMessage = error.message;
    }
    console.error(`[${error.name}] ${error.code}: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`[Error] ${error.name}: ${error.message}`);
    console.error(error.stack);
  }

  try {
    await message.reply(userMessage);
  } catch (replyError) {
    console.error("[ERROR] Failed to send error message to user:", replyError);
  }
}

// Logger for non-critical errors
export function logError(error: unknown, context: string): void {
  console.error(`[LOG] Error in ${context}:`, error);

  if (error instanceof Error) {
    console.error(`Stack: ${error.stack}`);
  }
}

// Wrapper for async functions with error handling
export function wrapAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R | void> {
  return async (...args: T): Promise<R | void> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, fn.name || "anonymous function");
      throw error;
    }
  };
}
