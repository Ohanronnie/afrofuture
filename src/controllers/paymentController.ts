import type { Request, Response } from "express";
import crypto from "crypto";
import { env } from "../config/env.js";
import { paystackService } from "../services/paystack.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { updateSession, getSession } from "../utils/session.js";
import { SESSION_STATES, TICKETS } from "../config/constants.js";
import { backend } from "../services/backend.js";
import { client } from "../config/client.js";
import type { UserSession } from "../types/session.js";
import QRCode from "qrcode";

/**
 * Paystack webhook handler
 */
export const handlePaystackWebhook = async (req: Request, res: Response) => {
  try {
    console.log(
      "[WEBHOOK] Raw Paystack webhook payload",
      JSON.stringify(req.body)
    );
    // Get raw body for signature verification
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", env.paystackSecretKey)
      .update(rawBody)
      .digest("hex");

    const signature = req.headers["x-paystack-signature"] as string;
    if (hash !== signature) {
      console.error("Invalid webhook signature");
      return res
        .status(401)
        .json({ status: "error", message: "Invalid signature" });
    }

    const event =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Handle different event types
    if (event.event === "charge.success") {
      const { reference, amount, customer, metadata } = event.data;

      console.log(
        "[WEBHOOK] charge.success event",
        JSON.stringify({ reference, amount, customer, metadata })
      );

      // Verify payment
      const verification = await paystackService.verifyPayment(reference);

      if (verification.status === "success") {
        // Update payment record
        const payment = await Payment.findOne({
          paystackReference: reference,
        });

        console.log("[WEBHOOK] Matched payment in DB", payment);

        if (payment && payment.status === "pending") {
          payment.status = "success";
          payment.paidAt = new Date(verification.paidAt);
          await payment.save();

          // Process payment based on metadata
          await processPaymentSuccess(
            payment.chatId,
            payment.amount,
            payment.metadata || {}
          );
        }
      }
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Webhook error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Webhook processing failed" });
  }
};

/**
 * Process successful payment
 */
async function processPaymentSuccess(
  chatId: string,
  amount: number,
  metadata: Record<string, any>
) {
  try {
    console.log(
      "[PROCESS_PAYMENT_SUCCESS] Starting",
      JSON.stringify({ chatId, amount, metadata })
    );

    const user = await User.findOne({ chatId });
    if (!user) {
      console.error(`User not found for chatId: ${chatId}`);
      return;
    }

    const session = (await getSession(chatId)) as UserSession;
    const ticketType = (metadata.ticketType || session.ticketType) as
      | "GA"
      | "VIP";

    if (!ticketType || !["GA", "VIP"].includes(ticketType)) {
      console.error(`Invalid ticket type for chatId: ${chatId}`);
      return;
    }

    const ticket = TICKETS[ticketType];

    await updateSession(chatId, {
      amountPaid: amount,
      remainingBalance: 0,
      state: SESSION_STATES.MAIN_MENU,
    });

    // Send confirmation message (admin will send ticket later)
    await sendPaymentConfirmation(chatId, ticket.name);
  } catch (error) {
    console.error("Payment processing error:", error);
  }
}

/**
 * Send payment confirmation message
 */
async function sendPaymentConfirmation(
  chatId: string,
  ticketName: string,
  ticketId?: string,
  isFullyPaid: boolean = false,
  installmentNumber?: number,
  totalInstallments?: number,
  remainingBalance?: number,
  nextDueDate?: string
) {
  try {
    let message = "";

    message = `✅ Payment Confirmed!\n\n🎫 Ticket: ${ticketName}\n\n👥 An AfroFuture admin will send your official ticket and QR code to this chat shortly.\n\nThank you for your payment!`;
    console.log(`[DEBUG] Sending message: ${message}`);
    await client.sendMessage(chatId, message);

    // No QR or ticket generated automatically; admins will send manually.
  } catch (error) {
    console.error("Message sending error:", error);
  }
}

/**
 * Payment callback handler (redirect after payment)
 */
export const handlePaymentCallback = async (req: Request, res: Response) => {
  try {
    const { reference } = req.query;

    if (!reference || typeof reference !== "string") {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid reference" });
    }

    console.log("[CALLBACK] Received callback", { reference });

    // Verify payment
    const verification = await paystackService.verifyPayment(reference);

    console.log("[CALLBACK] Verification result", verification);

    if (verification.status === "success") {
      // Update payment record
      const payment = await Payment.findOne({ paystackReference: reference });

      console.log("[CALLBACK] Matched payment in DB", payment);

      if (payment && payment.status === "pending") {
        payment.status = "success";
        payment.paidAt = new Date(verification.paidAt);
        await payment.save();

        // Process payment
        await processPaymentSuccess(
          payment.chatId,
          payment.amount,
          payment.metadata || {}
        );
      }

      return res.status(200).json({
        status: "success",
        message: "Payment verified successfully",
      });
    } else {
      return res.status(400).json({
        status: "error",
        message: "Payment verification failed",
      });
    }
  } catch (error) {
    console.error("Callback error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Callback processing failed" });
  }
};
