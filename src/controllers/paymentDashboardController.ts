import type { Request, Response } from "express";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import type { UserSession } from "../types/session.js";

/**
 * Get payment dashboard statistics
 */
export const getPaymentDashboard = async (req: Request, res: Response) => {
  try {
    // Active users with total money paid
    const activeUsers = await User.find({
      "session.ticketId": { $exists: true, $ne: null },
    });

    let totalMoneyFromActiveUsers = 0;
    for (const user of activeUsers) {
      const session = user.session as UserSession;
      if (session.amountPaid) {
        totalMoneyFromActiveUsers += session.amountPaid;
      } else if (session.totalPrice) {
        totalMoneyFromActiveUsers += session.totalPrice;
      }
    }

    // Pending payments count (users with remaining balance)
    const pendingPaymentsCount = await User.countDocuments({
      "session.ticketId": { $exists: false },
      "session.remainingBalance": { $gt: 0 },
    });

    // Total transaction count (successful payments)
    const totalTransactionCount = await Payment.countDocuments({
      status: "success",
    });

    // Total amount from all successful payments
    const totalRevenueResult = await Payment.aggregate([
      {
        $match: {
          status: "success",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const totalRevenue =
      totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    res.json({
      status: "success",
      data: {
        activeUsers: {
          count: activeUsers.length,
          totalMoney: totalMoneyFromActiveUsers,
        },
        pendingPayments: {
          count: pendingPaymentsCount,
        },
        transactions: {
          totalCount: totalTransactionCount,
          totalRevenue: totalRevenue,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching payment dashboard:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch payment dashboard",
    });
  }
};

/**
 * Get payment history
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Get successful payments with user information
    const payments = await Payment.find({
      status: "success",
    })
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select("chatId amount paidAt createdAt");

    // Get user names for each payment
    const paymentHistory = await Promise.all(
      payments.map(async (payment) => {
        const user = await User.findOne({ chatId: payment.chatId }).select(
          "name"
        );
        return {
          userName: user?.name || "Unknown",
          amount: payment.amount,
          paidAt: payment.paidAt || payment.createdAt,
        };
      })
    );

    const total = await Payment.countDocuments({
      status: "success",
    });

    res.json({
      status: "success",
      data: {
        payments: paymentHistory,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch payment history",
    });
  }
};

/**
 * Get detailed payment statistics
 */
export const getPaymentStatistics = async (req: Request, res: Response) => {
  try {
    // Payment status breakdown
    const statusBreakdown = await Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    // Payments by ticket type
    const paymentsByTicketType = await Payment.aggregate([
      {
        $match: {
          status: "success",
        },
      },
      {
        $group: {
          _id: "$ticketType",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    // Payments by payment type
    const paymentsByPaymentType = await Payment.aggregate([
      {
        $match: {
          status: "success",
        },
      },
      {
        $group: {
          _id: "$paymentType",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    // Recent payments (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPayments = await Payment.countDocuments({
      status: "success",
      paidAt: { $gte: sevenDaysAgo },
    });

    // Today's payments
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPayments = await Payment.countDocuments({
      status: "success",
      paidAt: { $gte: today },
    });

    const todayRevenueResult = await Payment.aggregate([
      {
        $match: {
          status: "success",
          paidAt: { $gte: today },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const todayRevenue =
      todayRevenueResult.length > 0 ? todayRevenueResult[0].total : 0;

    res.json({
      status: "success",
      data: {
        statusBreakdown: statusBreakdown.map((item) => ({
          status: item._id,
          count: item.count,
          totalAmount: item.totalAmount,
        })),
        byTicketType: paymentsByTicketType.map((item) => ({
          ticketType: item._id || "Unknown",
          count: item.count,
          totalAmount: item.totalAmount,
        })),
        byPaymentType: paymentsByPaymentType.map((item) => ({
          paymentType: item._id || "Unknown",
          count: item.count,
          totalAmount: item.totalAmount,
        })),
        recent: {
          last7Days: recentPayments,
          today: {
            count: todayPayments,
            revenue: todayRevenue,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching payment statistics:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch payment statistics",
    });
  }
};
