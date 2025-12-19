import { Router } from "express";
import { authenticateAdmin } from "../middleware/auth.js";
import { uploadImage } from "../middleware/upload.js";
import {
  adminLogin,
  getAllUsers,
  getUserInfo,
  generatePaymentLinkForUser,
  sendMessageToUser,
  createUser,
  getSoldTickets,
} from "../controllers/adminController.js";
import {
  getCurrentAdmin,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} from "../controllers/adminManagementController.js";

const router = Router();

/**
 * @swagger
 * /admin/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticate admin and receive JWT token
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@afrofuture.com"
 *               password:
 *                 type: string
 *                 example: "your-password"
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     email:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *                       example: "24h"
 *       401:
 *         description: Invalid credentials
 *       400:
 *         description: Validation error
 */
router.post("/login", adminLogin);

// All routes below require authentication
router.use(authenticateAdmin);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users with detailed information (Admin only)
 *     description: Returns paginated list of all users with ticket plans, payment info, and status flags
 *     tags: [Admin]
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
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [paid, pending, no_ticket]
 *         description: Filter by payment status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, phone number, or chat ID
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/users", getAllUsers);

/**
 * @swagger
 * /admin/users/{chatId}:
 *   get:
 *     summary: Get user information (Admin only)
 *     description: Retrieves detailed user information including ticket plan, payment status, and flags
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: User's WhatsApp chat ID
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/users/:chatId", getUserInfo);

/**
 * @swagger
 * /admin/payment-link:
 *   post:
 *     summary: Generate payment link for a user (Admin only)
 *     description: Allows admin to generate a payment link for any user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chatId
 *               - amount
 *             properties:
 *               chatId:
 *                 type: string
 *                 description: User's WhatsApp chat ID
 *                 example: "2331234567890@c.us"
 *               amount:
 *                 type: number
 *                 description: Payment amount in GHS
 *                 example: 918.75
 *               ticketType:
 *                 type: string
 *                 enum: [GA, VIP]
 *                 description: Ticket type (optional, uses user's session if not provided)
 *               paymentType:
 *                 type: string
 *                 enum: [full, installment]
 *                 description: Payment type (optional, defaults to full)
 *               installmentNumber:
 *                 type: number
 *                 description: Installment number (optional)
 *     responses:
 *       200:
 *         description: Payment link generated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/payment-link", generatePaymentLinkForUser);

/**
 * @swagger
 * /admin/send-message:
 *   post:
 *     summary: Send message to a user (Admin only)
 *     description: Send a WhatsApp message to a specific user with optional image attachment and record as a ticket sale
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - chatId
 *               - message
 *             properties:
 *               chatId:
 *                 type: string
 *                 description: User's WhatsApp chat ID
 *                 example: "2331234567890@c.us"
 *               message:
 *                 type: string
 *                 description: Message to send (will be used as caption if image is provided)
 *                 example: "Hello! This is a message from admin."
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional image file to send (jpeg, jpg, png, gif, webp, max 5MB)
 *               isTicket:
 *                 type: boolean
 *                 description: Whether this message should be recorded as a ticket sale
 *                 example: true
 *               ticketType:
 *                 type: string
 *                 description: Type of ticket (required if isTicket is true)
 *                 example: "VIP"
 *               price:
 *                 type: number
 *                 description: Price of the ticket (required if isTicket is true)
 *                 example: 500
 *     responses:
 *       200:
 *         description: Message sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/send-message", uploadImage.single("image"), sendMessageToUser);

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create a new user manually (Admin only)
 *     description: Allows admin to manually create a user in the system
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chatId
 *               - name
 *             properties:
 *               chatId:
 *                 type: string
 *                 description: User's WhatsApp chat ID (e.g., "2331234567890@c.us")
 *                 example: "2331234567890@c.us"
 *               name:
 *                 type: string
 *                 description: User's name
 *                 example: "John Doe"
 *               phoneNumber:
 *                 type: string
 *                 description: User's phone number (optional)
 *                 example: "0241234567"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address (optional)
 *                 example: "john@example.com"
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error or user already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/users", createUser);

/**
 * @swagger
 * components:
 *   schemas:
 *     SoldTicket:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             phoneNumber:
 *               type: string
 *         chatId:
 *           type: string
 *         userEmail:
 *           type: string
 *         ticketType:
 *           type: string
 *         price:
 *           type: number
 *         imageUrl:
 *           type: string
 *         location:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /admin/sold-tickets:
 *   get:
 *     summary: Get all sold tickets (Admin only)
 *     description: Returns paginated list of all tickets sent to users via the admin panel
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: chatId
 *         schema:
 *           type: string
 *       - in: query
 *         name: ticketType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sold tickets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tickets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SoldTicket'
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
 */
router.get("/sold-tickets", getSoldTickets);

/**
 * Admin Management Routes
 */
router.get("/me", getCurrentAdmin);
router.get("/admins", getAllAdmins);
router.post("/admins", createAdmin);
router.put("/admins/:id", updateAdmin);
router.delete("/admins/:id", deleteAdmin);

export default router;
