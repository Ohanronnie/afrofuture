import type { Request, Response } from "express";
import { User } from "../models/User.js";

/**
 * Get user statistics
 */
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments({});
    const paidUsers = await User.countDocuments({
      "session.ticketId": { $exists: true, $ne: null },
    });
    const pendingPaymentUsers = await User.countDocuments({
      "session.ticketId": { $exists: false },
      "session.remainingBalance": { $gt: 0 },
    });

    res.json({
      status: "success",
      data: {
        totalUsers,
        paidUsers,
        pendingPaymentUsers,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch stats" });
  }
};

/**
 * Get all users with pagination
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
      .select("-__v"); // Exclude version key

    const total = await User.countDocuments(filter);

    res.json({
      status: "success",
      data: {
        users,
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
    res.status(500).json({ status: "error", message: "Failed to fetch users" });
  }
};
