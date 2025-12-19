/**
 * NEW API: Dashboard Overview Controller
 * This API combines statistics from users, payments, and tickets for the dashboard overview page
 */
import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";
import { Ticket } from "../models/Ticket.js";
import { SoldTicket } from "../models/SoldTicket.js";
import { getSession } from "../utils/session.js";
import type { UserSession } from "../types/session.js";

/**
 * Get dashboard overview statistics
 * Combines user stats, payment stats, and ticket stats
 */
export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments({});
    const paidUsers = await User.countDocuments({
      "session.ticketId": { $exists: true, $ne: null },
    });
    const pendingPaymentUsers = await User.countDocuments({
      "session.ticketId": { $exists: false },
      "session.remainingBalance": { $gt: 0 },
    });

    // Payment statistics
    const totalPayments = await Payment.countDocuments({ status: "success" });
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

    const pendingPayments = await Payment.countDocuments({
      status: "pending",
    });

    // Ticket statistics
    const totalTickets = await Ticket.countDocuments({});
    const activeTickets = await Ticket.countDocuments({ isActive: true });
    const totalTicketsSold = await SoldTicket.countDocuments({});

    // Recent activity (last 10 payments)
    const recentPayments = await Payment.find({ status: "success" })
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(10)
      .select("chatId amount paidAt createdAt")
      .lean();

    const recentActivity = await Promise.all(
      recentPayments.map(async (payment) => {
        const user = await User.findOne({ chatId: payment.chatId }).select(
          "name"
        );
        return {
          id: payment._id.toString(),
          type: "payment" as const,
          message: `${user?.name || "Unknown"} made a payment of GH₵${
            payment.amount
          }`,
          timestamp: payment.paidAt || payment.createdAt,
          user: user?.name || "Unknown",
        };
      })
    );

    // Recent user registrations (last 5)
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name createdAt")
      .lean();

    const recentUserActivity = recentUsers.map((user) => ({
      id: user._id.toString(),
      type: "user" as const,
      message: `${user.name} registered`,
      timestamp: user.createdAt,
      user: user.name,
    }));

    // Combine and sort by timestamp
    const allActivity = [...recentActivity, ...recentUserActivity]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);

    // Calculate trends (compare with previous period - last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Users trend
    const usersLast7Days = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });
    const usersPrevious7Days = await User.countDocuments({
      createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
    });
    const usersTrend =
      usersPrevious7Days > 0
        ? ((usersLast7Days - usersPrevious7Days) / usersPrevious7Days) * 100
        : usersLast7Days > 0
        ? 100
        : 0;

    // Revenue trend
    const revenueLast7Days = await Payment.aggregate([
      {
        $match: {
          status: "success",
          paidAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
    const revenuePrevious7Days = await Payment.aggregate([
      {
        $match: {
          status: "success",
          paidAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
    const revenueLast7 = revenueLast7Days[0]?.total || 0;
    const revenuePrevious7 = revenuePrevious7Days[0]?.total || 0;
    const revenueTrend =
      revenuePrevious7 > 0
        ? ((revenueLast7 - revenuePrevious7) / revenuePrevious7) * 100
        : revenueLast7 > 0
        ? 100
        : 0;

    // Tickets sold trend
    const ticketsLast7Days = await SoldTicket.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });
    const ticketsPrevious7Days = await SoldTicket.countDocuments({
      createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
    });
    const ticketsTrend =
      ticketsPrevious7Days > 0
        ? ((ticketsLast7Days - ticketsPrevious7Days) / ticketsPrevious7Days) *
          100
        : ticketsLast7Days > 0
        ? 100
        : 0;

    // Active payments trend
    const activePaymentsLast7Days = await Payment.countDocuments({
      status: "pending",
      createdAt: { $gte: sevenDaysAgo },
    });
    const activePaymentsPrevious7Days = await Payment.countDocuments({
      status: "pending",
      createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
    });
    const activePaymentsTrend =
      activePaymentsPrevious7Days > 0
        ? ((activePaymentsLast7Days - activePaymentsPrevious7Days) /
            activePaymentsPrevious7Days) *
          100
        : activePaymentsLast7Days > 0
        ? 100
        : 0;

    res.json({
      status: "success",
      data: {
        users: {
          total: totalUsers,
          paid: paidUsers,
          pending: pendingPaymentUsers,
        },
        payments: {
          total: totalPayments,
          pending: pendingPayments,
          revenue: totalRevenue,
        },
        tickets: {
          total: totalTickets,
          active: activeTickets,
          sold: totalTicketsSold,
        },
        recentActivity: allActivity,
        trends: {
          users: parseFloat(usersTrend.toFixed(1)),
          revenue: parseFloat(revenueTrend.toFixed(1)),
          tickets: parseFloat(ticketsTrend.toFixed(1)),
          activePayments: parseFloat(activePaymentsTrend.toFixed(1)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dashboard overview",
    });
  }
};
