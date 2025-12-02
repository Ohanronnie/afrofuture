import { Router } from "express";
import { authenticateAdmin } from "../middleware/auth.js";
import {
  getPaymentDashboard,
  getPaymentHistory,
  getPaymentStatistics,
} from "../controllers/paymentDashboardController.js";

const router = Router();

// All payment dashboard routes require admin authentication
router.use(authenticateAdmin);

/**
 * @swagger
 * /admin/payments/dashboard:
 *   get:
 *     summary: Get payment dashboard statistics (Admin only)
 *     description: Returns active users with total money, pending payments count, and total transaction count
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     activeUsers:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                         totalMoney:
 *                           type: number
 *                     pendingPayments:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                     transactions:
 *                       type: object
 *                       properties:
 *                         totalCount:
 *                           type: number
 *                         totalRevenue:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/dashboard", getPaymentDashboard);

/**
 * @swagger
 * /admin/payments/history:
 *   get:
 *     summary: Get payment history (Admin only)
 *     description: Returns paginated list of successful payments with user names and amounts
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
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
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userName:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           paidAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/history", getPaymentHistory);

/**
 * @swagger
 * /admin/payments/statistics:
 *   get:
 *     summary: Get detailed payment statistics (Admin only)
 *     description: Returns detailed payment breakdown by status, ticket type, payment type, and recent activity
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/statistics", getPaymentStatistics);

export default router;
