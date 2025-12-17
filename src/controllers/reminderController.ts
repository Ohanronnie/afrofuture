import type { Request, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { ReminderTemplate } from "../models/ReminderTemplate.js";
import { ReminderLog } from "../models/ReminderLog.js";
import { User } from "../models/User.js";
import { client } from "../config/client.js";
import type { UserSession } from "../types/session.js";
import { backend } from "../services/backend.js";
import { daysUntil } from "../utils/date.js";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["payment_due", "custom"]),
  triggerDays: z.number().min(0).optional(),
  messageTemplate: z.string().min(1, "Message template is required"),
  isActive: z.boolean().default(true),
  filter: z.enum(["all", "paid", "pending"]).default("pending"),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["payment_due", "custom"]).optional(),
  triggerDays: z.number().min(0).optional(),
  messageTemplate: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  filter: z.enum(["all", "paid", "pending"]).optional(),
});

const sendReminderSchema = z.object({
  templateId: z.string().optional(),
  chatId: z.string().optional(),
  message: z.string().optional(),
  filter: z.enum(["all", "paid", "pending"]).optional(),
});

/**
 * Replace template variables with actual values
 */
function replaceTemplateVariables(
  template: string,
  variables: {
    amount?: number;
    daysLeft?: number;
    paymentLink?: string;
    dueDate?: string;
    userName?: string;
    ticketType?: string;
  }
): string {
  let message = template;
  if (variables.amount !== undefined) {
    message = message.replace(/\{\{amount\}\}/g, variables.amount.toFixed(2));
  }
  if (variables.daysLeft !== undefined) {
    message = message.replace(
      /\{\{daysLeft\}\}/g,
      variables.daysLeft.toString()
    );
  }
  if (variables.paymentLink) {
    message = message.replace(/\{\{paymentLink\}\}/g, variables.paymentLink);
  }
  if (variables.dueDate) {
    message = message.replace(/\{\{dueDate\}\}/g, variables.dueDate);
  }
  if (variables.userName) {
    message = message.replace(/\{\{userName\}\}/g, variables.userName);
  }
  if (variables.ticketType) {
    message = message.replace(/\{\{ticketType\}\}/g, variables.ticketType);
  }
  return message;
}

/**
 * Get all reminder templates
 */
export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await ReminderTemplate.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      status: "success",
      data: {
        templates: templates.map((t) => ({
          id: t._id.toString(),
          name: t.name,
          description: t.description,
          type: t.type,
          triggerDays: t.triggerDays,
          messageTemplate: t.messageTemplate,
          isActive: t.isActive,
          filter: t.filter,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching reminder templates:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch reminder templates",
    });
  }
};

/**
 * Get reminder template by ID
 */
export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await ReminderTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        status: "error",
        message: "Reminder template not found",
      });
    }

    res.json({
      status: "success",
      data: {
        template: {
          id: template._id.toString(),
          name: template.name,
          description: template.description,
          type: template.type,
          triggerDays: template.triggerDays,
          messageTemplate: template.messageTemplate,
          isActive: template.isActive,
          filter: template.filter,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching reminder template:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch reminder template",
    });
  }
};

/**
 * Create reminder template
 */
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const currentAdmin = (req as any).admin;
    const validatedData = createTemplateSchema.parse(req.body);

    // Validate triggerDays for payment_due type
    if (validatedData.type === "payment_due" && !validatedData.triggerDays) {
      return res.status(400).json({
        status: "error",
        message: "triggerDays is required for payment_due type",
      });
    }

    const template = await ReminderTemplate.create({
      ...validatedData,
      createdBy: currentAdmin?.id || null,
    });

    res.status(201).json({
      status: "success",
      data: {
        template: {
          id: template._id.toString(),
          name: template.name,
          description: template.description,
          type: template.type,
          triggerDays: template.triggerDays,
          messageTemplate: template.messageTemplate,
          isActive: template.isActive,
          filter: template.filter,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: error.issues,
      });
    }

    console.error("Error creating reminder template:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to create reminder template",
    });
  }
};

/**
 * Update reminder template
 */
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateTemplateSchema.parse(req.body);

    const template = await ReminderTemplate.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        status: "error",
        message: "Reminder template not found",
      });
    }

    res.json({
      status: "success",
      data: {
        template: {
          id: template._id.toString(),
          name: template.name,
          description: template.description,
          type: template.type,
          triggerDays: template.triggerDays,
          messageTemplate: template.messageTemplate,
          isActive: template.isActive,
          filter: template.filter,
          updatedAt: template.updatedAt,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: error.issues,
      });
    }

    console.error("Error updating reminder template:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to update reminder template",
    });
  }
};

/**
 * Delete reminder template
 */
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await ReminderTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({
        status: "error",
        message: "Reminder template not found",
      });
    }

    res.json({
      status: "success",
      data: {
        message: "Reminder template deleted successfully",
      },
    });
  } catch (error) {
    console.error("Error deleting reminder template:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete reminder template",
    });
  }
};

/**
 * Get reminder logs/history
 */
export const getReminderLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.triggerType) {
      filter.triggerType = req.query.triggerType;
    }
    if (req.query.chatId) {
      filter.chatId = req.query.chatId;
    }

    const logs = await ReminderLog.find(filter)
      .sort({ sentAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await ReminderLog.countDocuments(filter);

    res.json({
      status: "success",
      data: {
        logs: logs.map((log) => ({
          id: log._id.toString(),
          templateId: log.templateId?.toString(),
          templateName: log.templateName,
          chatId: log.chatId,
          userName: log.userName,
          message: log.message,
          status: log.status,
          errorMessage: log.errorMessage,
          triggerType: log.triggerType,
          triggerDays: log.triggerDays,
          sentAt: log.sentAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching reminder logs:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch reminder logs",
    });
  }
};

/**
 * Manually send reminder
 */
export const sendReminder = async (req: Request, res: Response) => {
  try {
    const currentAdmin = (req as any).admin;
    const validatedData = sendReminderSchema.parse(req.body);
    const { templateId, chatId, message, filter } = validatedData;

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // If specific chatId provided, send to that user only
    if (chatId) {
      const user = await User.findOne({ chatId });
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      let finalMessage = message;
      if (templateId && !message) {
        const template = await ReminderTemplate.findById(templateId);
        if (!template) {
          return res.status(404).json({
            status: "error",
            message: "Template not found",
          });
        }

        const session = user.session as UserSession;
        const variables: any = {
          userName: user.name,
          ticketType: session.ticketType,
        };

        if (session.remainingBalance) {
          variables.amount = session.remainingBalance;
          variables.daysLeft = session.nextDueDateISO
            ? daysUntil(session.nextDueDateISO)
            : undefined;
          variables.dueDate = session.nextDueDate || undefined;

          if (session.ticketType) {
            try {
              const { paymentLink } = await backend.generatePaymentLink(
                session.remainingBalance,
                chatId,
                chatId,
                {
                  ticketType: session.ticketType,
                  paymentType: session.paymentType || "installment",
                  installmentNumber: session.installmentNumber || 1,
                }
              );
              variables.paymentLink = paymentLink;
            } catch (error) {
              console.error("Error generating payment link:", error);
            }
          }
        }

        finalMessage = replaceTemplateVariables(
          template.messageTemplate,
          variables
        );
      }

      if (!finalMessage) {
        return res.status(400).json({
          status: "error",
          message: "Message is required",
        });
      }

      try {
        await client.sendMessage(chatId, finalMessage);
        await ReminderLog.create({
          templateId: templateId
            ? new mongoose.Types.ObjectId(templateId)
            : undefined,
          templateName: templateId
            ? (
                await ReminderTemplate.findById(templateId)
              )?.name
            : undefined,
          chatId,
          userName: user.name,
          message: finalMessage,
          status: "sent",
          triggerType: "manual",
          sentBy: currentAdmin?.id
            ? new mongoose.Types.ObjectId(currentAdmin.id)
            : undefined,
        });
        sentCount++;
      } catch (error: any) {
        failedCount++;
        errors.push(`${chatId}: ${error.message}`);
        await ReminderLog.create({
          templateId: templateId
            ? new mongoose.Types.ObjectId(templateId)
            : undefined,
          chatId,
          userName: user.name,
          message: finalMessage || "",
          status: "failed",
          errorMessage: error.message,
          triggerType: "manual",
          sentBy: currentAdmin?.id
            ? new mongoose.Types.ObjectId(currentAdmin.id)
            : undefined,
        });
      }
    } else {
      // Send to multiple users based on filter
      let users = await User.find({});
      const sessionFilter = filter || "pending";

      if (sessionFilter === "paid") {
        users = users.filter((user) => {
          const session = user.session as UserSession;
          return session.ticketId !== undefined;
        });
      } else if (sessionFilter === "pending") {
        users = users.filter((user) => {
          const session = user.session as UserSession;
          return (
            !session.ticketId &&
            session.remainingBalance &&
            session.remainingBalance > 0
          );
        });
      }

      let template = null;
      if (templateId) {
        template = await ReminderTemplate.findById(templateId);
        if (!template) {
          return res.status(404).json({
            status: "error",
            message: "Template not found",
          });
        }
      }

      for (const user of users) {
        let finalMessage = message;
        try {
          if (template && !message) {
            const session = user.session as UserSession;
            const variables: any = {
              userName: user.name,
              ticketType: session.ticketType,
            };

            if (session.remainingBalance) {
              variables.amount = session.remainingBalance;
              variables.daysLeft = session.nextDueDateISO
                ? daysUntil(session.nextDueDateISO)
                : undefined;
              variables.dueDate = session.nextDueDate || undefined;

              if (session.ticketType) {
                try {
                  const { paymentLink } = await backend.generatePaymentLink(
                    session.remainingBalance,
                    user.chatId,
                    user.chatId,
                    {
                      ticketType: session.ticketType,
                      paymentType: session.paymentType || "installment",
                      installmentNumber: session.installmentNumber || 1,
                    }
                  );
                  variables.paymentLink = paymentLink;
                } catch (error) {
                  console.error("Error generating payment link:", error);
                }
              }
            }

            finalMessage = replaceTemplateVariables(
              template.messageTemplate,
              variables
            );
          }

          if (!finalMessage) {
            continue;
          }

          await client.sendMessage(user.chatId, finalMessage);
          await ReminderLog.create({
            templateId: template?._id,
            templateName: template?.name,
            chatId: user.chatId,
            userName: user.name,
            message: finalMessage,
            status: "sent",
            triggerType: "manual",
            sentBy: currentAdmin?.id
              ? new mongoose.Types.ObjectId(currentAdmin.id)
              : undefined,
          });
          sentCount++;

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error: any) {
          failedCount++;
          errors.push(`${user.chatId}: ${error.message}`);
          await ReminderLog.create({
            templateId: template?._id,
            chatId: user.chatId,
            userName: user.name,
            message: finalMessage || "",
            status: "failed",
            errorMessage: error.message,
            triggerType: "manual",
            sentBy: currentAdmin?.id
              ? new mongoose.Types.ObjectId(currentAdmin.id)
              : undefined,
          });
        }
      }
    }

    res.json({
      status: "success",
      data: {
        sentCount,
        failedCount,
        totalUsers: sentCount + failedCount,
        errors: errors.slice(0, 10), // Limit errors in response
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: error.issues,
      });
    }

    console.error("Error sending reminder:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to send reminder",
    });
  }
};

/**
 * Get reminder statistics
 */
export const getReminderStats = async (req: Request, res: Response) => {
  try {
    const totalSent = await ReminderLog.countDocuments({ status: "sent" });
    const totalFailed = await ReminderLog.countDocuments({ status: "failed" });
    const automaticSent = await ReminderLog.countDocuments({
      triggerType: "automatic",
      status: "sent",
    });
    const manualSent = await ReminderLog.countDocuments({
      triggerType: "manual",
      status: "sent",
    });

    // Last 7 days stats
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSent = await ReminderLog.countDocuments({
      status: "sent",
      sentAt: { $gte: sevenDaysAgo },
    });
    const recentFailed = await ReminderLog.countDocuments({
      status: "failed",
      sentAt: { $gte: sevenDaysAgo },
    });

    res.json({
      status: "success",
      data: {
        total: {
          sent: totalSent,
          failed: totalFailed,
          totalAttempts: totalSent + totalFailed,
        },
        byType: {
          automatic: automaticSent,
          manual: manualSent,
        },
        recent: {
          sent: recentSent,
          failed: recentFailed,
          period: "7 days",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching reminder stats:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch reminder statistics",
    });
  }
};
