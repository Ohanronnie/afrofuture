import type { Request, Response } from "express";
import { Broadcast } from "../models/Broadcast.js";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";
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
    // Get all users with successful payments
    const paidChatIds = await Payment.distinct("chatId", {
      status: "success",
    });
    
    // Filter users to only those with successful payments
    users = users.filter((user) => {
      if (!user.chatId) return false;
      return paidChatIds.includes(user.chatId);
    });
    
    console.log(`[BROADCAST] Filtered to ${users.length} paid users from ${paidChatIds.length} unique paid chatIds`);
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
  let failedCount = 0;
  const usersWithChatId = users.filter((u) => u.chatId);
  
  console.log(
    `[BROADCAST] Starting broadcast to ${users.length} users (${usersWithChatId.length} with chatId) (filter: ${filter})...`
  );

  if (usersWithChatId.length === 0) {
    console.warn(`[BROADCAST] WARNING: No users with chatId found for filter: ${filter}`);
  }

  for (const user of usersWithChatId) {
    try {
      await client.sendMessage(user.chatId!, message);
      sentCount++;
      console.log(`[BROADCAST] ✓ Sent to ${user.chatId} (${user.name || 'Unknown'})`);
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err: any) {
      failedCount++;
      console.error(`[BROADCAST] ✗ Failed to send to ${user.chatId} (${user.name || 'Unknown'}):`, err?.message || err);
    }
  }

  console.log(`[BROADCAST] Complete: ${sentCount} sent, ${failedCount} failed, ${usersWithChatId.length} total users`);
  return { sentCount, totalUsers: usersWithChatId.length, filter };
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

        // Save to database with explicit values
        const broadcast = new Broadcast({
          message,
          filter,
          status: "sent",
          sentCount: result.sentCount ?? 0,
          totalUsers: result.totalUsers ?? 0,
          executedAt: new Date(),
        });
        await broadcast.save();

        console.log(`[BROADCAST] Saved broadcast to DB: _id=${broadcast._id}, sentCount=${broadcast.sentCount}, totalUsers=${broadcast.totalUsers}, filter=${filter}`);
        
        // Verify the saved values
        const verifyBroadcast = await Broadcast.findById(broadcast._id).lean();
        if (verifyBroadcast) {
          console.log(`[BROADCAST] Verification: saved sentCount=${verifyBroadcast.sentCount}, totalUsers=${verifyBroadcast.totalUsers}`);
        }

        return result;
      } catch (error) {
        // Save failed broadcast
        const broadcast = new Broadcast({
          message,
          filter,
          status: "failed",
          sentCount: 0,
          totalUsers: 0,
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
            broadcast.sentCount = result.sentCount || 0;
            broadcast.totalUsers = result.totalUsers || 0;
            broadcast.executedAt = new Date();
            await broadcast.save();
            console.log(`[BROADCAST] Scheduled broadcast executed: sentCount=${broadcast.sentCount}, totalUsers=${broadcast.totalUsers}`);
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
            broadcast.sentCount = result.sentCount || 0;
            broadcast.totalUsers = result.totalUsers || 0;
            broadcast.executedAt = new Date();
            await broadcast.save();
            console.log(`[BROADCAST] Scheduled broadcast executed: sentCount=${broadcast.sentCount}, totalUsers=${broadcast.totalUsers}`);
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
      
      // Fetch the saved broadcast to return complete data
      const savedBroadcast = await Broadcast.findOne({
        message,
        filter,
        status: "sent",
      })
        .sort({ createdAt: -1 })
        .lean();
      
      res.json({ 
        status: "success", 
        ...result,
        broadcast: savedBroadcast ? {
          ...savedBroadcast,
          _id: savedBroadcast._id.toString(),
          sentCount: savedBroadcast.sentCount ?? result.sentCount,
          totalUsers: savedBroadcast.totalUsers ?? result.totalUsers,
        } : null,
      });
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
      .skip(skip)
      .lean(); // Convert to plain objects to ensure all fields are serialized

    const total = await Broadcast.countDocuments({
      status: { $in: ["sent", "failed"] },
    });

    // Ensure sentCount and totalUsers are included (default to 0 if undefined)
    const broadcastsWithDefaults = broadcasts.map((broadcast: any) => ({
      ...broadcast,
      _id: broadcast._id.toString(),
      sentCount: broadcast.sentCount ?? 0,
      totalUsers: broadcast.totalUsers ?? 0,
    }));

    res.json({
      status: "success",
      data: {
        broadcasts: broadcastsWithDefaults,
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
    })
      .sort({ scheduleTime: 1 })
      .lean(); // Convert to plain objects to ensure all fields are serialized

    // Ensure sentCount and totalUsers are included (default to 0 if undefined)
    const broadcastsWithDefaults = broadcasts.map((broadcast: any) => ({
      ...broadcast,
      _id: broadcast._id.toString(),
      sentCount: broadcast.sentCount ?? 0,
      totalUsers: broadcast.totalUsers ?? 0,
    }));

    res.json({
      status: "success",
      data: {
        broadcasts: broadcastsWithDefaults,
        count: broadcastsWithDefaults.length,
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
