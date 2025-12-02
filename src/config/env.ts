// Environment configuration
import { config } from "dotenv";

// Load environment variables
config();

export const env = {
  // Backend
  backendApiUrl:
    process.env.BACKEND_API_URL || "https://gmn34qz3-3000.uks1.devtunnels.ms/",
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || "",
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || "",

  // Database
  databaseUrl: process.env.DATABASE_URL || process.env.MONGO_URI || "",

  // Support
  supportPhone: process.env.SUPPORT_PHONE || "+233 55 000 0000",
  supportEmail: process.env.SUPPORT_EMAIL || "support@afrofuture.com",

  // Admin
  adminEmail: process.env.ADMIN_EMAIL || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",

  // Event
  eventName: process.env.EVENT_NAME || "AfroFuture 2025",
  eventDates: process.env.EVENT_DATES || "December 28 & 29, 2025",
  eventLocation: process.env.EVENT_LOCATION || "El-Wak Stadium, Accra",
  installmentDeadline:
    process.env.INSTALLMENT_DEADLINE || "2025-12-13T23:59:59",

  // Ticket Pricing
  gaPrice: parseFloat(process.env.GA_PRICE || "918.75"),
  vipPrice: parseFloat(process.env.VIP_PRICE || "1617.50"),

  // Scheduler Configuration (milliseconds)
  reminderCheckInterval: parseInt(
    process.env.REMINDER_CHECK_INTERVAL || "21600000"
  ), // 6 hours
  deadlineCheckInterval: parseInt(
    process.env.DEADLINE_CHECK_INTERVAL || "86400000"
  ), // 24 hours

  // Environment
  nodeEnv: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",
};
