import { Router } from "express";
import { getUserStats, getAllUsers } from "../controllers/userController.js";

const router = Router();

/**
 * @swagger
 * /users/stats:
 *   get:
 *     summary: Get user statistics
 *     description: Returns counts of total users, paid users, and users with pending payments
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
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
 *                     totalUsers:
 *                       type: number
 *                       example: 150
 *                     paidUsers:
 *                       type: number
 *                       example: 80
 *                     pendingPaymentUsers:
 *                       type: number
 *                       example: 45
 *       500:
 *         description: Server error
 */
router.get("/stats", getUserStats);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Returns a paginated list of all users with optional filtering and search
 *     tags: [Users]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [paid, pending]
 *         description: Filter users by payment status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search users by name, phone number, or chat ID
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                       type: array
 *                       items:
 *                         type: object
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
 *       500:
 *         description: Server error
 */
router.get("/", getAllUsers);

export default router;
