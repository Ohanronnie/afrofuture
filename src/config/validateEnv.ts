import { config } from "dotenv";

// Load environment variables
config();

interface EnvValidationRule {
  key: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean | string;
  defaultValue?: string;
}

const envRules: EnvValidationRule[] = [
  // Database
  {
    key: "MONGO_URI",
    required: true,
    description: "MongoDB connection URI",
    validator: (value) => {
      if (
        !value.startsWith("mongodb://") &&
        !value.startsWith("mongodb+srv://")
      ) {
        return "Must be a valid MongoDB URI (mongodb:// or mongodb+srv://)";
      }
      return true;
    },
  },
  {
    key: "DATABASE_URL",
    required: false,
    description: "Alternative database URL (used if MONGO_URI not set)",
  },

  // Paystack
  {
    key: "PAYSTACK_SECRET_KEY",
    required: true,
    description: "Paystack secret key for payment processing",
    validator: (value) => {
      if (!value.startsWith("sk_")) {
        return "Paystack secret key must start with 'sk_'";
      }
      return true;
    },
  },
  {
    key: "PAYSTACK_PUBLIC_KEY",
    required: false,
    description: "Paystack public key (optional, for frontend)",
  },

  // Admin
  {
    key: "ADMIN_EMAIL",
    required: true,
    description: "Admin email for authentication",
    validator: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Must be a valid email address";
      }
      return true;
    },
  },
  {
    key: "ADMIN_PASSWORD",
    required: true,
    description: "Admin password (will be hashed automatically at startup)",
    validator: (value) => {
      if (value.length < 8) {
        return "Password must be at least 8 characters long";
      }
      return true;
    },
  },
  {
    key: "JWT_SECRET",
    required: true,
    description: "JWT secret key for token signing",
    validator: (value) => {
      if (
        value === "your-secret-key-change-in-production" ||
        value.length < 32
      ) {
        return "JWT secret must be at least 32 characters and not the default value";
      }
      return true;
    },
  },
  {
    key: "JWT_EXPIRES_IN",
    required: false,
    description: "JWT token expiration time (default: 24h)",
    defaultValue: "24h",
  },

  // Backend
  {
    key: "BACKEND_API_URL",
    required: false,
    description:
      "Backend API URL for webhooks (default: https://api.afrofuture.com)",
    defaultValue: "https://gmn34qz3-3000.uks1.devtunnels.ms/",
  },

  // Support (optional)
  {
    key: "SUPPORT_PHONE",
    required: false,
    description: "Support phone number",
    defaultValue: "+233 55 000 0000",
  },
  {
    key: "SUPPORT_EMAIL",
    required: false,
    description: "Support email address",
    defaultValue: "support@afrofuture.com",
  },

  // Event (optional)
  {
    key: "EVENT_NAME",
    required: false,
    description: "Event name",
    defaultValue: "AfroFuture 2025",
  },
  {
    key: "EVENT_DATES",
    required: false,
    description: "Event dates",
    defaultValue: "December 28 & 29, 2025",
  },
  {
    key: "EVENT_LOCATION",
    required: false,
    description: "Event location",
    defaultValue: "El-Wak Stadium, Accra",
  },
  {
    key: "INSTALLMENT_DEADLINE",
    required: false,
    description: "Installment payment deadline (ISO 8601 format)",
    defaultValue: "2025-12-13T23:59:59",
  },

  // Ticket Pricing (optional)
  {
    key: "GA_PRICE",
    required: false,
    description: "General Admission ticket price",
    defaultValue: "918.75",
  },
  {
    key: "VIP_PRICE",
    required: false,
    description: "VIP ticket price",
    defaultValue: "1617.50",
  },

  // Scheduler (optional)
  {
    key: "REMINDER_CHECK_INTERVAL",
    required: false,
    description: "Reminder check interval in milliseconds",
    defaultValue: "21600000",
  },
  {
    key: "DEADLINE_CHECK_INTERVAL",
    required: false,
    description: "Deadline check interval in milliseconds",
    defaultValue: "86400000",
  },

  // Environment
  {
    key: "NODE_ENV",
    required: false,
    description: "Node environment (development, production, etc.)",
    defaultValue: "development",
  },
];

interface ValidationError {
  key: string;
  message: string;
  description: string;
}

export function validateEnv(): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Special check: At least one database URI must be set
  const mongoUri = process.env.MONGO_URI;
  const databaseUrl = process.env.DATABASE_URL;
  if (!mongoUri && !databaseUrl) {
    errors.push({
      key: "MONGO_URI or DATABASE_URL",
      message:
        "At least one database URI must be set (MONGO_URI or DATABASE_URL)",
      description: "MongoDB connection URI is required",
    });
  }

  for (const rule of envRules) {
    const value = process.env[rule.key];

    // Skip MONGO_URI/DATABASE_URL if we already handled it above
    if (
      (rule.key === "MONGO_URI" || rule.key === "DATABASE_URL") &&
      !mongoUri &&
      !databaseUrl
    ) {
      continue;
    }

    // Check if required variable is missing
    if (rule.required && !value) {
      errors.push({
        key: rule.key,
        message: `Required environment variable ${rule.key} is missing`,
        description: rule.description,
      });
      continue;
    }

    // Skip validation if value is not set and not required
    if (!value) {
      continue;
    }

    // Run custom validator if provided
    if (rule.validator) {
      const validationResult = rule.validator(value);
      if (validationResult !== true) {
        errors.push({
          key: rule.key,
          message:
            typeof validationResult === "string"
              ? validationResult
              : `Invalid value for ${rule.key}`,
          description: rule.description,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function printEnvValidationErrors(errors: ValidationError[]): void {
  console.error("\n❌ Environment Variable Validation Failed!\n");
  console.error("Missing or invalid environment variables:\n");

  errors.forEach((error, index) => {
    console.error(`${index + 1}. ${error.key}`);
    console.error(`   Description: ${error.description}`);
    console.error(`   Error: ${error.message}\n`);
  });

  console.error(
    "Please set the required environment variables in your .env file."
  );
  console.error("See .env.example for reference.\n");
}
