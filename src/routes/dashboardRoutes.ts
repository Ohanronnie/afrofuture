/**
 * NEW API: Dashboard Routes
 * Routes for dashboard overview and analytics
 */
import { Router } from "express";
import { authenticateAdmin } from "../middleware/auth.js";
import { getDashboardOverview } from "../controllers/dashboardController.js";
import { getSystemHealth, getQRCodeEndpoint } from "../controllers/systemHealthController.js";

const router = Router();

// All dashboard routes require admin authentication
router.use(authenticateAdmin);

/**
 * @swagger
 * /admin/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview statistics (Admin only)
 *     description: Returns combined statistics from users, payments, and tickets for the dashboard overview page
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully
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
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         paid:
 *                           type: number
 *                         pending:
 *                           type: number
 *                     payments:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         pending:
 *                           type: number
 *                         revenue:
 *                           type: number
 *                     tickets:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         active:
 *                           type: number
 *                         sold:
 *                           type: number
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/overview", getDashboardOverview);
router.get("/system-health", getSystemHealth);

/**
 * @swagger
 * /admin/dashboard/qr-code:
 *   get:
 *     summary: Get WhatsApp QR code for authentication (Admin only)
 *     description: Returns the current QR code as a data URL image. Only available when client needs authentication.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: QR code retrieved successfully
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
 *                     qrCode:
 *                       type: string
 *                       description: QR code as data URL (image/png;base64,...)
 *                       example: "data:image/png;base64,iVBORw0KGgoAAAANS..."
 *                     qrCodeString:
 *                       type: string
 *                       description: Raw QR code string
 *                     isAuthenticated:
 *                       type: boolean
 *                       description: Whether client is already authenticated
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/qr-code", getQRCodeEndpoint);

export default router;
