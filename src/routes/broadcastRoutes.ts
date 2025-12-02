import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { z } from "zod";
import {
  createBroadcast,
  getRecentBroadcasts,
  getScheduledBroadcasts,
} from "../controllers/broadcastController.js";

const router = Router();

const broadcastSchema = z.object({
  message: z.string().min(1),
  filter: z.enum(["all", "paid", "pending"]).default("all"),
  scheduleTime: z.string().optional(), // ISO 8601 format or cron expression
});

/**
 * @swagger
 * /broadcast:
 *   post:
 *     summary: Broadcast messages to users
 *     description: Send messages to all users or filtered groups, with optional scheduling
 *     tags: [Broadcast]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: The message to broadcast
 *                 example: "🎉 AfroFuture 2025 is coming soon!"
 *               filter:
 *                 type: string
 *                 enum: [all, paid, pending]
 *                 default: all
 *                 description: Filter recipients by payment status
 *               scheduleTime:
 *                 type: string
 *                 description: ISO 8601 date or cron expression for scheduling
 *                 example: "2025-12-01T10:00:00Z"
 *     responses:
 *       200:
 *         description: Broadcast sent or scheduled successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post("/", validate(broadcastSchema), createBroadcast);

/**
 * @swagger
 * /broadcasts/recent:
 *   get:
 *     summary: Get recent broadcasts
 *     description: Returns a paginated list of recently sent or failed broadcasts
 *     tags: [Broadcast]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Recent broadcasts retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/recent", getRecentBroadcasts);

/**
 * @swagger
 * /broadcasts/scheduled:
 *   get:
 *     summary: Get scheduled broadcasts
 *     description: Returns a list of all scheduled broadcasts that haven't been executed yet
 *     tags: [Broadcast]
 *     responses:
 *       200:
 *         description: Scheduled broadcasts retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/scheduled", getScheduledBroadcasts);

export default router;
