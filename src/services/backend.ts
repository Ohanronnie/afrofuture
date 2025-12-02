import { BackendError } from "../errors/AppError.js";
import { paystackService } from "./paystack.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { client } from "../config/client.js";
import QRCode from "qrcode";
import type { Message } from "whatsapp-web.js";

// Backend functions with Paystack integration
export const backend = {
  /**
   * Generate payment link using Paystack
   */
  async generatePaymentLink(
    amount: number,
    userId: string,
    chatId: string,
    metadata?: {
      ticketType?: "GA" | "VIP";
      paymentType?: "full" | "installment";
      installmentNumber?: number;
    }
  ): Promise<{ paymentLink: string; reference: string }> {
    try {
      // Get user email or use a sensible fallback
      const user = await User.findOne({ chatId });
      console.log(
        "[BACKEND] Generating payment link",
        JSON.stringify({
          chatId,
          userId,
          amount,
          metadata,
          user: user
            ? {
                chatId: user.chatId,
                name: user.name,
                phoneNumber: user.phoneNumber,
                email: (user as any).email,
              }
            : null,
        })
      );

      const email =
        (user as any)?.email ||
        (user?.phoneNumber
          ? `${user.phoneNumber.split("@")[0]}@afrofuture.local`
          : `${user?.name || chatId}@afrofuture.com`);

      // Initialize payment with Paystack
      const { authorizationUrl, accessCode, reference } =
        await paystackService.initializePayment(amount, email, metadata);

      // Save payment record
      const payment = new Payment({
        userId,
        chatId,
        amount,
        currency: "GHS",
        paystackReference: reference,
        paystackAccessCode: accessCode,
        status: "pending",
        ticketType: metadata?.ticketType,
        paymentType: metadata?.paymentType,
        installmentNumber: metadata?.installmentNumber,
        metadata,
      });
      await payment.save();

      console.log(
        "[BACKEND] Payment record created",
        JSON.stringify({
          chatId,
          userId,
          amount,
          reference,
          email,
          metadata,
        })
      );

      return {
        paymentLink: authorizationUrl,
        reference,
      };
    } catch (error) {
      console.error("Payment link generation error:", error);
      throw new BackendError(
        "Failed to generate payment link. Please try again."
      );
    }
  },

  /**
   * Generate ticket ID
   */
  generateTicketId(): string {
    try {
      // Generate ticket ID: AF + timestamp (last 8 digits) + random (4 digits)
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      return `AF${timestamp}${random}`;
    } catch (error) {
      throw new BackendError("Failed to generate ticket ID. Please try again.");
    }
  },

  /**
   * Generate and send QR code
   */
  async sendQRCode(
    messageOrClient: Message | typeof client,
    chatId: string,
    ticketId: string
  ): Promise<void> {
    try {
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(ticketId, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 300,
        margin: 2,
      });

      // Convert data URL to buffer
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Send QR code image via WhatsApp
      const { MessageMedia } = await import("whatsapp-web.js");
      const media = new MessageMedia(
        "image/png",
        imageBuffer.toString("base64"),
        "ticket.png"
      );

      if ("reply" in messageOrClient) {
        // It's a Message object
        await messageOrClient.reply(media);
        await messageOrClient.reply(
          `🔳 Your Official Ticket\n\n🆔 Ticket ID: #${ticketId}\n\n✨ Present this QR code at the entrance. See you at AfroFuture 2025!`
        );
      } else {
        // It's the client
        await messageOrClient.sendMessage(chatId, media);
        await messageOrClient.sendMessage(
          chatId,
          `🔳 Your Official Ticket\n\n🆔 Ticket ID: #${ticketId}\n\n✨ Present this QR code at the entrance. See you at AfroFuture 2025!`
        );
      }
    } catch (error) {
      console.error("QR code generation error:", error);
      // Fallback to text if QR code fails
      const fallbackMessage = `🆔 Your Ticket ID: #${ticketId}\n\n✨ Present this at the entrance. See you at AfroFuture 2025!`;
      if ("reply" in messageOrClient) {
        await messageOrClient.reply(fallbackMessage);
      } else {
        await messageOrClient.sendMessage(chatId, fallbackMessage);
      }
    }
  },

  /**
   * Verify payment with Paystack
   */
  async verifyPayment(reference: string): Promise<{
    success: boolean;
    amount: number;
    metadata?: Record<string, any>;
  }> {
    try {
      console.log("[BACKEND] Verifying payment", { reference });

      const verification = await paystackService.verifyPayment(reference);

      console.log("[BACKEND] Verification result", verification);

      // Update payment record
      const payment = await Payment.findOne({ paystackReference: reference });
      console.log("[BACKEND] Matched payment record", payment);

      if (payment) {
        payment.status =
          verification.status === "success" ? "success" : "failed";
        if (verification.paidAt) {
          payment.paidAt = new Date(verification.paidAt);
        }
        await payment.save();
      } else {
        console.warn(
          "[BACKEND] No payment record found for reference",
          reference
        );
      }

      return {
        success: verification.status === "success",
        amount: verification.amount,
        metadata: verification.metadata,
      };
    } catch (error) {
      console.error("Payment verification error:", error);
      throw new BackendError(
        "Failed to verify payment. Please contact support."
      );
    }
  },

  /**
   * Process wallet transfer
   */
  async processWalletTransfer(
    userId: string,
    amount: number,
    destination: string
  ): Promise<void> {
    try {
      // In production, call backend API to process transfer
      console.log(
        `Processing wallet transfer: ${amount} to ${destination} for ${userId}`
      );
      // TODO: Implement actual wallet transfer logic
    } catch (error) {
      throw new BackendError(
        "Failed to process wallet transfer. Please try again."
      );
    }
  },
};
