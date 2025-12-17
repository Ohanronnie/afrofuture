import axios, { type AxiosInstance } from "axios";
import { env } from "../config/env.js";
import { BackendError } from "../errors/AppError.js";

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    amount: number;
    currency: string;
    status: string;
    reference: string;
    customer: {
      email: string;
    };
    paid_at: string;
    metadata?: Record<string, any>;
  };
}

class PaystackService {
  private client: AxiosInstance;
  private secretKey: string;

  constructor() {
    this.secretKey = env.paystackSecretKey;
    if (!this.secretKey) {
      throw new Error(
        "PAYSTACK_SECRET_KEY is not set in environment variables"
      );
    }

    this.client = axios.create({
      baseURL: "https://api.paystack.co",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(
    amount: number,
    email: string,
    metadata?: Record<string, any>
  ): Promise<{
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  }> {
    try {
      const amountInKobo = Math.round(amount * 100); // Convert to kobo (smallest currency unit)

      console.log(
        "[PAYSTACK] Initializing payment",
        JSON.stringify({ amount, amountInKobo, email, metadata })
      );

      const response = await this.client.post<PaystackInitializeResponse>(
        "/transaction/initialize",
        {
          amount: amountInKobo,
          email,
          currency: "GHS",
          channels: ["mobile_money"], // Restrict to Mobile Money only
          metadata,
          callback_url: new URL(
            "/api/payments/callback",
            env.backendApiUrl
          ).toString(),
        }
      );

      if (!response.data.status) {
        throw new BackendError(
          response.data.message || "Failed to initialize payment"
        );
      }

      console.log("[PAYSTACK] Initialize response", response.data);

      return {
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error: any) {
      if (error instanceof BackendError) {
        throw error;
      }
      console.error("Paystack initialization error:", error);
      throw new BackendError(
        error.response?.data?.message ||
          "Failed to initialize payment. Please try again."
      );
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    paidAt: string;
    metadata?: Record<string, any>;
  }> {
    try {
      console.log("[PAYSTACK] Verifying payment", { reference });

      const response = await this.client.get<PaystackVerifyResponse>(
        `/transaction/verify/${reference}`
      );

      if (!response.data.status) {
        throw new BackendError(
          response.data.message || "Failed to verify payment"
        );
      }

      const transaction = response.data.data;

      console.log("[PAYSTACK] Verify response", transaction);

      return {
        status: transaction.status,
        amount: transaction.amount / 100, // Convert from kobo
        currency: transaction.currency,
        paidAt: transaction.paid_at,
        metadata: transaction.metadata,
      };
    } catch (error: any) {
      if (error instanceof BackendError) {
        throw error;
      }
      console.error("Paystack verification error:", error);
      throw new BackendError(
        error.response?.data?.message ||
          "Failed to verify payment. Please contact support."
      );
    }
  }

  /**
   * Generate a unique payment reference
   */
  generateReference(userId: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    return `AFROFUTURE_${userId}_${ts}`;
  }
}

export const paystackService = new PaystackService();
