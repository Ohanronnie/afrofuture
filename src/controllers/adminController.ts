import type { Request, Response } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { getHashedAdminPassword } from "../config/initAdmin.js";
import { backend } from "../services/backend.js";
import { User } from "../models/User.js";
import { Admin } from "../models/Admin.js";
import { getSession } from "../utils/session.js";
import type { UserSession } from "../types/session.js";
import { TICKETS } from "../config/constants.js";
import { client } from "../config/client.js";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const generatePaymentLinkSchema = z.object({
  chatId: z.string().min(1, "Chat ID is required"),
  amount: z.number().positive("Amount must be positive"),
  ticketType: z.enum(["GA", "VIP"]).optional(),
  paymentType: z.enum(["full", "installment"]).optional(),
  installmentNumber: z.number().optional(),
});

const sendMessageSchema = z.object({
  chatId: z.string().min(1, "Chat ID is required"),
  message: z.string().min(1, "Message is required"),
});

/**
 * Admin login - Generate JWT token
 */
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Check if admin credentials are configured
    if (!env.adminEmail || !env.adminPassword || !env.jwtSecret) {
      return res.status(500).json({
        status: "error",
        message: "Admin credentials not configured",
      });
    }

    // Verify email
    if (email !== env.adminEmail) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Get or create admin in database
    let adminInfo = await Admin.findOne({ email: env.adminEmail });

    if (!adminInfo) {
      // Create default admin if doesn't exist
      const hashedPassword = await bcrypt.hash(password, 10);
      adminInfo = await Admin.create({
        email: env.adminEmail,
        password: hashedPassword,
        name: env.adminEmail.split("@")[0] || "Admin",
        role: "super_admin",
        isActive: true,
      });
    } else {
      // Verify password
      const isValidPassword = await bcrypt.compare(
        password,
        adminInfo.password
      );
      if (!isValidPassword) {
        // Also check against env password for backward compatibility
        const envHashedPassword = getHashedAdminPassword();
        const isValidEnvPassword = await bcrypt.compare(
          password,
          envHashedPassword
        );
        if (!isValidEnvPassword) {
          return res.status(401).json({
            status: "error",
            message: "Invalid credentials",
          });
        }
        // Update password in database if env password was used
        adminInfo.password = await bcrypt.hash(password, 10);
        await adminInfo.save();
      }
    }

    // Check if admin is active
    if (!adminInfo.isActive) {
      return res.status(403).json({
        status: "error",
        message: "Admin account is inactive",
      });
    }

    // Generate JWT token
    const secret: string = env.jwtSecret || "";
    if (!secret || secret === "your-secret-key-change-in-production") {
      return res.status(500).json({
        status: "error",
        message: "JWT secret not configured",
      });
    }
    const token = jwt.sign({ email: adminInfo.email }, secret, {
      expiresIn: env.jwtExpiresIn || "24h",
    } as jwt.SignOptions);

    res.json({
      status: "success",
      data: {
        token,
        email: adminInfo.email,
        name: adminInfo.name,
        expiresIn: env.jwtExpiresIn,
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

    console.error("Login error:", error);
    res.status(500).json({
      status: "error",
      message: "Login failed",
    });
  }
};

/**
 * Get all users with detailed information (Admin only)
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Optional filters
    const filter: any = {};

    if (req.query.status === "paid") {
      filter["session.ticketId"] = { $exists: true, $ne: null };
    } else if (req.query.status === "pending") {
      filter["session.ticketId"] = { $exists: false };
      filter["session.remainingBalance"] = { $gt: 0 };
    } else if (req.query.status === "no_ticket") {
      filter["session.ticketId"] = { $exists: false };
      filter["session.amountPaid"] = { $exists: false };
    }

    // Search by name or phone number
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, "i");
      filter.$or = [
        { name: searchRegex },
        { phoneNumber: searchRegex },
        { chatId: searchRegex },
      ];
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select("-__v");

    const total = await User.countDocuments(filter);

    // Enrich user data with session information
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const session = (await getSession(user.chatId)) as UserSession;
        const ticketType = session.ticketType;
        const ticket = ticketType ? TICKETS[ticketType] : null;

        // Calculate payment status flags
        const hasTicket = !!session.ticketId;
        const isFullyPaid = hasTicket || (session.remainingBalance || 0) === 0;
        const isInstallment = session.paymentType === "installment";
        const hasPartialPayment = (session.amountPaid || 0) > 0 && !isFullyPaid;
        const hasNoPayment = !session.amountPaid || session.amountPaid === 0;

        // Calculate payment progress
        const paymentProgress =
          session.totalPrice && session.amountPaid
            ? (session.amountPaid / session.totalPrice) * 100
            : 0;

        return {
          chatId: user.chatId,
          name: user.name,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          ticketPlan: {
            type: ticketType || null,
            name: ticket?.name || null,
            price: ticket?.price || null,
          },
          payment: {
            type: session.paymentType || null,
            amountPaid: session.amountPaid || 0,
            totalPrice: session.totalPrice || ticket?.price || 0,
            remainingBalance: session.remainingBalance || 0,
            progress: Math.round(paymentProgress),
          },
          installment: isInstallment
            ? {
                current: session.installmentNumber || 0,
                total: session.totalInstallments || 0,
                nextDueDate: session.nextDueDate || null,
                nextDueDateISO: session.nextDueDateISO || null,
              }
            : null,
          flags: {
            hasTicket,
            isFullyPaid,
            isInstallment,
            hasPartialPayment,
            hasNoPayment,
          },
          ticketId: session.ticketId || null,
          walletBalance: session.walletBalance || 0,
        };
      })
    );

    res.json({
      status: "success",
      data: {
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch users",
    });
  }
};

/**
 * Get user information (Admin only)
 */
export const getUserInfo = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({
        status: "error",
        message: "Chat ID is required",
      });
    }

    const user = await User.findOne({ chatId });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const session = (await getSession(chatId)) as UserSession;
    const ticketType = session.ticketType;
    const ticket = ticketType ? TICKETS[ticketType] : null;

    // Calculate payment status flags
    const hasTicket = !!session.ticketId;
    const isFullyPaid = hasTicket || (session.remainingBalance || 0) === 0;
    const isInstallment = session.paymentType === "installment";
    const hasPartialPayment = (session.amountPaid || 0) > 0 && !isFullyPaid;
    const hasNoPayment = !session.amountPaid || session.amountPaid === 0;

    // Calculate payment progress
    const paymentProgress =
      session.totalPrice && session.amountPaid
        ? (session.amountPaid / session.totalPrice) * 100
        : 0;

    res.json({
      status: "success",
      data: {
        user: {
          chatId: user.chatId,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        ticketPlan: {
          type: ticketType || null,
          name: ticket?.name || null,
          price: ticket?.price || null,
          description: ticket?.description || null,
        },
        payment: {
          type: session.paymentType || null,
          amountPaid: session.amountPaid || 0,
          totalPrice: session.totalPrice || ticket?.price || 0,
          remainingBalance: session.remainingBalance || 0,
          progress: Math.round(paymentProgress),
        },
        installment: isInstallment
          ? {
              current: session.installmentNumber || 0,
              total: session.totalInstallments || 0,
              nextDueDate: session.nextDueDate || null,
              nextDueDateISO: session.nextDueDateISO || null,
            }
          : null,
        flags: {
          hasTicket,
          isFullyPaid,
          isInstallment,
          hasPartialPayment,
          hasNoPayment,
        },
        ticketId: session.ticketId || null,
        walletBalance: session.walletBalance || 0,
        session: {
          state: session.state,
          ticketType: session.ticketType,
          paymentType: session.paymentType,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch user information",
    });
  }
};

/**
 * Generate payment link for a user (Admin only)
 */
export const generatePaymentLinkForUser = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = generatePaymentLinkSchema.parse(req.body);
    const { chatId, amount, ticketType, paymentType, installmentNumber } =
      validatedData;

    // Check if user exists
    const user = await User.findOne({ chatId });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Get user session to determine ticket type if not provided
    const session = (await getSession(chatId)) as UserSession;
    const finalTicketType = ticketType || session.ticketType;

    if (!finalTicketType) {
      return res.status(400).json({
        status: "error",
        message:
          "Ticket type is required. Either provide it in the request or ensure the user has selected a ticket type.",
      });
    }

    // Generate payment link
    const { paymentLink, reference } = await backend.generatePaymentLink(
      amount,
      chatId,
      chatId,
      {
        ticketType: finalTicketType,
        paymentType: paymentType || "full",
        installmentNumber: installmentNumber,
      }
    );

    res.json({
      status: "success",
      data: {
        paymentLink,
        reference,
        chatId,
        amount,
        ticketType: finalTicketType,
        paymentType: paymentType || "full",
        installmentNumber: installmentNumber,
        userName: user.name,
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

    console.error("Error generating payment link:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to generate payment link",
    });
  }
};

/**
 * Send message to a user (Admin only)
 */
export const sendMessageToUser = async (req: Request, res: Response) => {
  try {
    const validatedData = sendMessageSchema.parse(req.body);
    const { chatId, message } = validatedData;

    // Check if user exists
    const user = await User.findOne({ chatId });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Check if image was uploaded
    const file = (req as any).file as any;

    if (file) {
      // Send image with caption
      const { MessageMedia } = await import("whatsapp-web.js");
      const fs = await import("fs/promises");

      // Read the uploaded file
      const imageBuffer = await fs.readFile(file.path);
      const base64Image = imageBuffer.toString("base64");

      // Determine mimetype
      const mimeType = file.mimetype;

      // Create MessageMedia object
      const media = new MessageMedia(mimeType, base64Image, file.originalname);

      // Send image with caption (message)
      await client.sendMessage(chatId, media, { caption: message });

      // Clean up uploaded file
      await fs.unlink(file.path);

      return res.json({
        status: "success",
        data: {
          message: "Message with image sent successfully",
          chatId,
          userName: user.name,
          imageUploaded: true,
        },
      });
    } else {
      // Send text message only
      await client.sendMessage(chatId, message);

      return res.json({
        status: "success",
        data: {
          message: "Message sent successfully",
          chatId,
          userName: user.name,
          imageUploaded: false,
        },
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: error.issues,
      });
    }

    console.error("Error sending message:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to send message",
    });
  }
};

/**
 * NEW API: Create user manually (Admin only)
 * This allows admins to manually add users to the system
 */
const createUserSchema = z.object({
  chatId: z.string().min(1, "Chat ID is required"),
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export const createUser = async (req: Request, res: Response) => {
  try {
    const validatedData = createUserSchema.parse(req.body);
    const { chatId, name, phoneNumber, email } = validatedData;

    // Check if user already exists
    const existingUser = await User.findOne({ chatId });
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User with this chat ID already exists",
      });
    }

    // Create new user
    const user = new User({
      chatId,
      name,
      phoneNumber: phoneNumber || undefined,
      email: email || undefined,
      session: { state: "WELCOME" },
    });

    await user.save();

    res.status(201).json({
      status: "success",
      data: {
        user: {
          chatId: user.chatId,
          name: user.name,
          phoneNumber: user.phoneNumber,
          email: user.email,
          createdAt: user.createdAt,
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

    if (error.code === 11000) {
      return res.status(400).json({
        status: "error",
        message: "User with this chat ID already exists",
      });
    }

    console.error("Error creating user:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to create user",
    });
  }
};
