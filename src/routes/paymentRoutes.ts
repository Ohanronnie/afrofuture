import { Router } from "express";
import {
  handlePaystackWebhook,
  handlePaymentCallback,
} from "../controllers/paymentController.js";

const router = Router();

/**
 * @swagger
 * /payment/webhook:
 *   post:
 *     summary: Paystack webhook endpoint
 *     description: Receives payment events from Paystack
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Invalid signature
 *       500:
 *         description: Server error
 */
router.post("/webhook", handlePaystackWebhook);

/**
 * @swagger
 * /api/payments/callback:
 *   get:
 *     summary: Payment callback endpoint
 *     description: Handles redirect after payment completion
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Paystack payment reference
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *       400:
 *         description: Invalid reference or verification failed
 *       500:
 *         description: Server error
 */
router.get("/callback", handlePaymentCallback);

export default router;
