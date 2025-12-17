/**
 * NEW API: Dashboard Routes
 * Routes for dashboard overview and analytics
 */
import { Router } from "express";
import { authenticateAdmin } from "../middleware/auth.js";
import { getDashboardOverview } from "../controllers/dashboardController.js";
import { getSystemHealth } from "../controllers/systemHealthController.js";

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

export default router;
