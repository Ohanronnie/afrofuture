// Custom error class for application errors
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = "UNKNOWN_ERROR",
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400, true);
    this.name = "ValidationError";
  }
}

export class PaymentError extends AppError {
  constructor(message: string) {
    super(message, "PAYMENT_ERROR", 402, true);
    this.name = "PaymentError";
  }
}

export class SessionError extends AppError {
  constructor(message: string) {
    super(message, "SESSION_ERROR", 500, true);
    this.name = "SessionError";
  }
}

export class BackendError extends AppError {
  constructor(message: string) {
    super(message, "BACKEND_ERROR", 503, true);
    this.name = "BackendError";
  }
}
