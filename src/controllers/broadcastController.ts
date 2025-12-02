import type { Request, Response } from "express";
import { Broadcast } from "../models/Broadcast.js";
import { User } from "../models/User.js";
import { client } from "../config/client.js";
import type { UserSession } from "../types/session.js";
import cron, { type ScheduledTask } from "node-cron";

// Store scheduled broadcasts in memory (could be moved to DB for persistence)
const scheduledBroadcasts = new Map<string, ScheduledTask>();

/**
 * Send broadcast to users
 */
export const sendBroadcast = async (
  message: string,
  filter: "all" | "paid" | "pending"
): Promise<{ sentCount: number; totalUsers: number; filter: string }> => {
  let users = await User.find({});

  // Apply filter
  if (filter === "paid") {
    users = users.filter((user) => {
      const session = user.session as UserSession;
      return session.ticketId !== undefined;
    });
  } else if (filter === "pending") {
    users = users.filter((user) => {
      const session = user.session as UserSession;
      return (
        !session.ticketId &&
        session.remainingBalance &&
        session.remainingBalance > 0
      );
    });
  }

  let sentCount = 0;
  console.log(
    `Starting broadcast to ${users.length} users (filter: ${filter})...`
  );

  for (const user of users) {
    if (user.chatId) {
      try {
        await client.sendMessage(user.chatId, message);
        sentCount++;
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Failed to send to ${user.chatId}:`, err);
      }
    }
  }

  console.log(`Broadcast complete: ${sentCount}/${users.length} messages sent`);
  return { sentCount, totalUsers: users.length, filter };
};

/**
 * Create and send/schedule a broadcast
 */
export const createBroadcast = async (req: Request, res: Response) => {
  try {
    const { message, filter = "all", scheduleTime } = req.body;

    const sendBroadcastAndSave = async () => {
      try {
        const result = await sendBroadcast(message, filter);

        // Save to database
        const broadcast = new Broadcast({
          message,
          filter,
          status: "sent",
          sentCount: result.sentCount,
          totalUsers: result.totalUsers,
          executedAt: new Date(),
        });
        await broadcast.save();

        return result;
      } catch (error) {
        // Save failed broadcast
        const broadcast = new Broadcast({
          message,
          filter,
          status: "failed",
        });
        await broadcast.save();
        throw error;
      }
    };

    if (scheduleTime) {
      // Check if it's a cron expression or ISO date
      if (scheduleTime.includes(" ") || scheduleTime.includes("*")) {
        // Cron expression
        if (!cron.validate(scheduleTime)) {
          return res.status(400).json({
            status: "error",
            message: "Invalid cron expression",
          });
        }

        const scheduledDate = new Date(); // For cron, we use current time as reference
        const broadcast = new Broadcast({
          message,
          filter,
          status: "scheduled",
          scheduleTime: scheduledDate,
        });
        await broadcast.save();

        const task = cron.schedule(scheduleTime, async () => {
          console.log(`Executing scheduled broadcast (cron: ${scheduleTime})`);
          try {
            const result = await sendBroadcast(message, filter);
            broadcast.status = "sent";
            broadcast.sentCount = result.sentCount;
            broadcast.totalUsers = result.totalUsers;
            broadcast.executedAt = new Date();
            await broadcast.save();
          } catch (error) {
            broadcast.status = "failed";
            await broadcast.save();
          }
          scheduledBroadcasts.delete(broadcast._id.toString());
        });

        scheduledBroadcasts.set(broadcast._id.toString(), task);

        res.json({
          status: "success",
          message: "Broadcast scheduled with cron expression",
          scheduleTime,
          filter,
          broadcastId: broadcast._id,
        });
      } else {
        // ISO 8601 date
        const scheduledDate = new Date(scheduleTime);
        const now = new Date();

        if (isNaN(scheduledDate.getTime())) {
          return res.status(400).json({
            status: "error",
            message: "Invalid date format. Use ISO 8601 or cron expression",
          });
        }

        if (scheduledDate <= now) {
          return res.status(400).json({
            status: "error",
            message: "Scheduled time must be in the future",
          });
        }

        const broadcast = new Broadcast({
          message,
          filter,
          status: "scheduled",
          scheduleTime: scheduledDate,
        });
        await broadcast.save();

        const delay = scheduledDate.getTime() - now.getTime();

        setTimeout(async () => {
          console.log(`Executing scheduled broadcast (time: ${scheduleTime})`);
          try {
            const result = await sendBroadcast(message, filter);
            broadcast.status = "sent";
            broadcast.sentCount = result.sentCount;
            broadcast.totalUsers = result.totalUsers;
            broadcast.executedAt = new Date();
            await broadcast.save();
          } catch (error) {
            broadcast.status = "failed";
            await broadcast.save();
          }
        }, delay);

        res.json({
          status: "success",
          message: "Broadcast scheduled",
          scheduleTime: scheduledDate.toISOString(),
          filter,
          broadcastId: broadcast._id,
        });
      }
    } else {
      // Send immediately
      const result = await sendBroadcastAndSave();
      res.json({ status: "success", ...result });
    }
  } catch (error) {
    console.error("Broadcast error:", error);
    res.status(500).json({ status: "error", message: "Broadcast failed" });
  }
};

/**
 * Get recent broadcasts
 */
export const getRecentBroadcasts = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const broadcasts = await Broadcast.find({
      status: { $in: ["sent", "failed"] },
    })
      .sort({ executedAt: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Broadcast.countDocuments({
      status: { $in: ["sent", "failed"] },
    });

    res.json({
      status: "success",
      data: {
        broadcasts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching recent broadcasts:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch recent broadcasts" });
  }
};

/**
 * Get scheduled broadcasts
 */
export const getScheduledBroadcasts = async (req: Request, res: Response) => {
  try {
    const broadcasts = await Broadcast.find({
      status: "scheduled",
    }).sort({ scheduleTime: 1 });

    res.json({
      status: "success",
      data: {
        broadcasts,
        count: broadcasts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching scheduled broadcasts:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch scheduled broadcasts",
    });
  }
};
