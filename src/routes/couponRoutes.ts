import { Router } from "express";
import { authenticateAdmin } from "../middleware/auth.js";
import {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";

const router = Router();

router.use(authenticateAdmin);

/**
 * @swagger
 * components:
 *   schemas:
 *     Coupon:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         code:
 *           type: string
 *         discountType:
 *           type: string
 *           enum: [percentage, fixed]
 *         discountValue:
 *           type: number
 *         isActive:
 *           type: boolean
 *         usageCount:
 *           type: number
 *         maxUsage:
 *           type: number
 *           nullable: true
 *         expiryDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /admin/coupons:
 *   get:
 *     summary: Get all coupons (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Coupons retrieved successfully
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
 *                     coupons:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Coupon'
 *                     count:
 *                       type: number
 */
router.get("/", getAllCoupons);

/**
 * @swagger
 * /admin/coupons:
 *   post:
 *     summary: Create a new coupon (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discountType
 *               - discountValue
 *             properties:
 *               code:
 *                 type: string
 *                 example: "WAVE20"
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *                 example: "percentage"
 *               discountValue:
 *                 type: number
 *                 example: 20
 *               maxUsage:
 *                 type: number
 *                 example: 100
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Coupon created successfully
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
 *                     coupon:
 *                       $ref: '#/components/schemas/Coupon'
 */
router.post("/", createCoupon);

/**
 * @swagger
 * /admin/coupons/{id}:
 *   put:
 *     summary: Update a coupon (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               discountValue:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               maxUsage:
 *                 type: number
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Coupon updated successfully
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
 *                     coupon:
 *                       $ref: '#/components/schemas/Coupon'
 */
router.put("/:id", updateCoupon);

/**
 * @swagger
 * /admin/coupons/{id}:
 *   delete:
 *     summary: Delete a coupon (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
 */
router.delete("/:id", deleteCoupon);

export default router;
