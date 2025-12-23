import type { Request, Response } from "express";
import { ExcelBroadcast, type IExcelBroadcast } from "../models/ExcelBroadcast.js";
import { client } from "../config/client.js";
import * as XLSX from "xlsx";
import * as fs from "fs/promises";
import * as path from "path";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null;
  
  let cleaned = phone.toString().trim().replace(/\D/g, "");
  
  if (cleaned.length === 0) return null;
  
  if (cleaned.startsWith("0")) {
    cleaned = "233" + cleaned.substring(1);
  } else if (!cleaned.startsWith("233")) {
    cleaned = "233" + cleaned;
  }
  
  return cleaned + "@c.us";
}

async function isWhatsAppNumber(chatId: string): Promise<boolean> {
  try {
    const numberId = chatId.replace("@c.us", "");
    try {
      const contact = await client.getNumberId(numberId);
      return contact !== null && contact !== undefined;
    } catch (error) {
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function parseExcelFile(filePath: string, phoneColumn: string): Promise<string[]> {
  const fileExtension = path.extname(filePath).toLowerCase();
  let phoneNumbers: string[] = [];

  if (fileExtension === ".csv") {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");
    if (lines.length === 0) return phoneNumbers;

    const headers = lines[0].split(",").map((h) => h.trim());
    const phoneColumnIndex = headers.findIndex(
      (h) => h.toLowerCase() === phoneColumn.toLowerCase()
    );

    if (phoneColumnIndex === -1) {
      throw new Error(`Column "${phoneColumn}" not found in CSV file`);
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      if (values[phoneColumnIndex]) {
        const phone = normalizePhoneNumber(values[phoneColumnIndex]);
        if (phone) {
          phoneNumbers.push(phone);
        }
      }
    }
  } else {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    if (data.length === 0) return phoneNumbers;

    const firstRow = data[0] as Record<string, any>;
    const columnKeys = Object.keys(firstRow);
    const phoneColumnKey = columnKeys.find(
      (key) => key.toLowerCase() === phoneColumn.toLowerCase()
    );

    if (!phoneColumnKey) {
      throw new Error(`Column "${phoneColumn}" not found in Excel file`);
    }

    for (const row of data) {
      const phone = normalizePhoneNumber((row as Record<string, any>)[phoneColumnKey]);
      if (phone) {
        phoneNumbers.push(phone);
      }
    }
  }

  return [...new Set(phoneNumbers)];
}

async function sendBatchMessages(
  phoneNumbers: string[],
  message: string,
  broadcast: IExcelBroadcast
): Promise<{ sent: number; failed: number; skipped: number }> {
  const counters = { sent: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
    const batch = phoneNumbers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (chatId) => {
        try {
          const isRegistered = await isWhatsAppNumber(chatId);
          if (!isRegistered) {
            return { status: "skipped", chatId };
          }

          await client.sendMessage(chatId, message);
          return { status: "sent", chatId };
        } catch (error) {
          console.error(`Failed to send to ${chatId}:`, error);
          return { status: "failed", chatId };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        if (result.value.status === "sent") {
          counters.sent++;
        } else if (result.value.status === "failed") {
          counters.failed++;
        } else {
          counters.skipped++;
        }
      } else {
        counters.failed++;
      }
    }

    if (i + BATCH_SIZE < phoneNumbers.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }

    broadcast.sentCount = counters.sent;
    broadcast.failedCount = counters.failed;
    broadcast.skippedCount = counters.skipped;
    await broadcast.save();
  }

  return counters;
}

export const createExcelBroadcast = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Excel file is required",
      });
    }

    const { message, phoneColumn = "Mobile", scheduleTime } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Message is required",
      });
    }

    const filePath = file.path;
    let phoneNumbers: string[];

    try {
      phoneNumbers = await parseExcelFile(filePath, phoneColumn);
    } catch (error) {
      await fs.unlink(filePath).catch(() => {});
      return res.status(400).json({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to parse Excel file",
      });
    }

    if (phoneNumbers.length === 0) {
      await fs.unlink(filePath).catch(() => {});
      return res.status(400).json({
        status: "error",
        message: "No valid phone numbers found in the specified column",
      });
    }

    const broadcast = new ExcelBroadcast({
      message: message.trim(),
      phoneColumn,
      fileName: file.originalname,
      status: scheduleTime ? "scheduled" : "processing",
      totalContacts: phoneNumbers.length,
      scheduleTime: scheduleTime ? new Date(scheduleTime) : undefined,
    });
    await broadcast.save();

    const sendBroadcastMessages = async () => {
      try {
        broadcast.status = "processing";
        await broadcast.save();

        const result = await sendBatchMessages(phoneNumbers, message.trim(), broadcast);

        broadcast.status = "sent";
        broadcast.executedAt = new Date();
        await broadcast.save();

        await fs.unlink(filePath).catch(() => {});
      } catch (error) {
        console.error("Excel broadcast error:", error);
        broadcast.status = "failed";
        await broadcast.save();
        await fs.unlink(filePath).catch(() => {});
      }
    };

    if (scheduleTime) {
      const scheduledDate = new Date(scheduleTime);
      const now = new Date();

      if (isNaN(scheduledDate.getTime())) {
        await fs.unlink(filePath).catch(() => {});
        return res.status(400).json({
          status: "error",
          message: "Invalid date format. Use ISO 8601",
        });
      }

      if (scheduledDate <= now) {
        await fs.unlink(filePath).catch(() => {});
        return res.status(400).json({
          status: "error",
          message: "Scheduled time must be in the future",
        });
      }

      const delay = scheduledDate.getTime() - now.getTime();
      setTimeout(sendBroadcastMessages, delay);

      res.json({
        status: "success",
        message: "Excel broadcast scheduled",
        data: {
          broadcastId: broadcast._id,
          totalContacts: phoneNumbers.length,
          scheduleTime: scheduledDate.toISOString(),
        },
      });
    } else {
      sendBroadcastMessages();
      res.json({
        status: "success",
        message: "Excel broadcast started",
        data: {
          broadcastId: broadcast._id,
          totalContacts: phoneNumbers.length,
        },
      });
    }
  } catch (error) {
    console.error("Excel broadcast error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to process Excel broadcast",
    });
  }
};

export const getExcelBroadcasts = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const broadcasts = await ExcelBroadcast.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await ExcelBroadcast.countDocuments({});

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
    console.error("Error fetching Excel broadcasts:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch Excel broadcasts",
    });
  }
};

export const getExcelBroadcast = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const broadcast = await ExcelBroadcast.findById(id);

    if (!broadcast) {
      return res.status(404).json({
        status: "error",
        message: "Excel broadcast not found",
      });
    }

    res.json({
      status: "success",
      data: broadcast,
    });
  } catch (error) {
    console.error("Error fetching Excel broadcast:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch Excel broadcast",
    });
  }
};


