import { Router } from "express";
import { authenticateAdmin } from "../middleware/auth.js";
import {
  getAllTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
} from "../controllers/ticketController.js";

const router = Router();

// All ticket routes require admin authentication
router.use(authenticateAdmin);

/**
 * @swagger
 * /admin/tickets:
 *   get:
 *     summary: Get all tickets with stats (Admin only)
 *     description: Returns all tickets with pricing, quantity, sold, and available counts
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tickets retrieved successfully
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
 *                     tickets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           description:
 *                             type: string
 *                           price:
 *                             type: number
 *                           totalQuantity:
 *                             type: number
 *                           sold:
 *                             type: number
 *                           available:
 *                             type: number
 *                           isActive:
 *                             type: boolean
 *                     count:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", getAllTickets);

/**
 * @swagger
 * /admin/tickets/{id}:
 *   get:
 *     summary: Get a single ticket by ID or type (Admin only)
 *     description: Retrieves ticket details by ID or type
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID or type (e.g., "GA", "VIP")
 *     responses:
 *       200:
 *         description: Ticket retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getTicket);

/**
 * @swagger
 * /admin/tickets:
 *   post:
 *     summary: Create a new ticket (Admin only)
 *     description: Creates a new ticket type with name, description, price, and quantity
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - description
 *               - price
 *               - totalQuantity
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Wave 1: VVIP"
 *               type:
 *                 type: string
 *                 example: "VVIP"
 *                 description: Unique ticket type identifier (uppercase)
 *               description:
 *                 type: string
 *                 example: "Very Very Important Person access"
 *               price:
 *                 type: number
 *                 example: 2500.00
 *               totalQuantity:
 *                 type: number
 *                 example: 100
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       400:
 *         description: Validation error or ticket type already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/", createTicket);

/**
 * @swagger
 * /admin/tickets/{id}:
 *   put:
 *     summary: Update a ticket (Admin only)
 *     description: Updates ticket details
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID or type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               totalQuantity:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Server error
 */
router.put("/:id", updateTicket);

/**
 * @swagger
 * /admin/tickets/{id}:
 *   delete:
 *     summary: Delete a ticket (Admin only)
 *     description: Deletes a ticket if no tickets have been sold
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID or type
 *     responses:
 *       200:
 *         description: Ticket deleted successfully
 *       400:
 *         description: Cannot delete ticket with sold tickets
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", deleteTicket);

export default router;
