import { Router } from "express";
import { authenticateAdmin } from "../middleware/auth.js";
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getReminderLogs,
  sendReminder,
  getReminderStats,
} from "../controllers/reminderController.js";

const router = Router();

// All reminder routes require admin authentication
router.use(authenticateAdmin);

/**
 * @swagger
 * /admin/reminders/templates:
 *   get:
 *     summary: Get all reminder templates (Admin only)
 *     tags: [Reminders]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get("/templates", getAllTemplates);

/**
 * @swagger
 * /admin/reminders/templates/{id}:
 *   get:
 *     summary: Get reminder template by ID (Admin only)
 *     tags: [Reminders]
 *     security:
 *       - BearerAuth: []
 */
router.get("/templates/:id", getTemplateById);

/**
 * @swagger
 * /admin/reminders/templates:
 *   post:
 *     summary: Create reminder template (Admin only)
 *     tags: [Reminders]
 *     security:
 *       - BearerAuth: []
 */
router.post("/templates", createTemplate);

/**
 * @swagger
 * /admin/reminders/templates/{id}:
 *   put:
 *     summary: Update reminder template (Admin only)
 *     tags: [Reminders]
 *     security:
 *       - BearerAuth: []
 */
router.put("/templates/:id", updateTemplate);

/**
 * @swagger
 * /admin/reminders/templates/{id}:
 *   delete:
 *     summary: Delete reminder template (Admin only)
 *     tags: [Reminders]
 *     security:
 *       - BearerAuth: []
 */
router.delete("/templates/:id", deleteTemplate);

/**
 * @swagger
 * /admin/reminders/logs:
 *   get:
 *     summary: Get reminder logs/history (Admin only)
 *     tags: [Reminders]
 *     security:
 *       - BearerAuth: []
 */
router.get("/logs", getReminderLogs);

/**
 * @swagger
 * /admin/reminders/send:
 *   post:
 *     summary: Manually send reminder (Admin only)
 *     tags: [Reminders]
 *     security:
 *       - BearerAuth: []
 */
router.post("/send", sendReminder);

/**
 * @swagger
 * /admin/reminders/stats:
 *   get:
 *     summary: Get reminder statistics (Admin only)
 *     tags: [Reminders]
 *     security:
 *       - BearerAuth: []
 */
router.get("/stats", getReminderStats);

export default router;
