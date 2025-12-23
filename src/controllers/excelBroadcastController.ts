import type { Request, Response } from "express";
import {
  ExcelBroadcast,
  type IExcelBroadcast,
} from "../models/ExcelBroadcast.js";
import { client } from "../config/client.js";
import * as XLSX from "xlsx";
import * as fs from "fs/promises";
import * as path from "path";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null;

  const original = phone.toString().trim();
  let cleaned = original;

  if (cleaned.length === 0) return null;

  cleaned = cleaned.replace(/\D/g, "");

  if (cleaned.length === 0) {
    console.log(`Invalid phone number (empty after cleaning): ${original}`);
    return null;
  }

  const beforeNormalization = cleaned;

  if (cleaned.startsWith("0")) {
    cleaned = "233" + cleaned.substring(1);
  } else if (cleaned.startsWith("233")) {
    cleaned = cleaned;
  } else if (cleaned.length >= 9 && cleaned.length <= 10) {
    cleaned = "233" + cleaned;
  } else if (cleaned.length >= 11 && cleaned.length <= 15) {
    cleaned = cleaned;
  } else {
    console.log(
      `Invalid phone number format (length ${cleaned.length}): ${original} -> ${cleaned}`
    );
    return null;
  }

  if (cleaned.length < 10 || cleaned.length > 15) {
    console.log(
      `Invalid phone number length (${cleaned.length}): ${original} -> ${cleaned}`
    );
    return null;
  }

  const result = cleaned + "@c.us";
  console.log(
    `Normalized phone: ${original} -> ${beforeNormalization} -> ${cleaned} -> ${result}`
  );
  return result;
}

function convertScientificNotation(value: any): string {
  if (typeof value === "number") {
    return value.toString();
  }

  const str = String(value).trim();

  if (
    str.includes("E+") ||
    str.includes("e+") ||
    str.includes("E-") ||
    str.includes("e-")
  ) {
    const num = parseFloat(str);
    if (!isNaN(num)) {
      return num.toFixed(0);
    }
  }

  return str;
}

async function ensureClientReady(): Promise<boolean> {
  try {
    let state: string;
    try {
      state = client.info ? "READY" : (await client.getState()).toString();
    } catch (error) {
      state = "UNKNOWN";
    }

    if (state === "READY" || state === "CONNECTED") {
      return true;
    }
    console.log(`WhatsApp client not ready, state: ${state}`);
    return false;
  } catch (error: any) {
    console.log(`Error checking client state: ${error?.message || error}`);
    return false;
  }
}

async function parseExcelFile(
  filePath: string,
  phoneColumn: string
): Promise<string[]> {
  const fileExtension = path.extname(filePath).toLowerCase();
  let phoneNumbers: string[] = [];

  if (fileExtension === ".csv") {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");
    if (lines.length === 0) return phoneNumbers;

    const firstLine = lines[0];
    if (!firstLine) return phoneNumbers;

    const headers = firstLine.split(",").map((h) => h.trim());
    const phoneColumnIndex = headers.findIndex(
      (h) => h.toLowerCase() === phoneColumn.toLowerCase()
    );

    if (phoneColumnIndex === -1) {
      throw new Error(`Column "${phoneColumn}" not found in CSV file`);
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const values = line.split(",");
      if (values[phoneColumnIndex] !== undefined) {
        const rawValue = values[phoneColumnIndex]?.trim() || "";
        if (rawValue) {
          const converted = convertScientificNotation(rawValue);
          const phone = normalizePhoneNumber(converted);
          if (phone) {
            phoneNumbers.push(phone);
          }
        }
      }
    }
  } else {
    const workbook = XLSX.readFile(filePath);
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Excel file has no sheets");
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("Excel file has no valid sheet");
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in Excel file`);
    }

    const data = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: "" });

    if (data.length === 0) return phoneNumbers;

    const firstRow = data[0] as Record<string, any>;
    if (!firstRow) return phoneNumbers;

    const columnKeys = Object.keys(firstRow);
    const phoneColumnKey = columnKeys.find(
      (key) => key.toLowerCase() === phoneColumn.toLowerCase()
    );

    if (!phoneColumnKey) {
      throw new Error(`Column "${phoneColumn}" not found in Excel file`);
    }

    for (const row of data) {
      const rawValue = (row as Record<string, any>)[phoneColumnKey];
      if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
        const converted = convertScientificNotation(rawValue);
        const phone = normalizePhoneNumber(converted);
        if (phone) {
          phoneNumbers.push(phone);
        }
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

  const isReady = await ensureClientReady();
  if (!isReady) {
    throw new Error(
      "WhatsApp client is not ready. Please ensure the bot is connected and authenticated."
    );
  }

  console.log(`Starting to send messages to ${phoneNumbers.length} numbers`);
  console.log(`Sample numbers:`, phoneNumbers.slice(0, 3));

  for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
    const batch = phoneNumbers.slice(i, i + BATCH_SIZE);
    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}, numbers:`,
      batch
    );

    const batchResults = await Promise.allSettled(
      batch.map(async (chatId) => {
        try {
          console.log(`Sending message to ${chatId}`);
          await client.sendMessage(chatId, message);
          console.log(`Successfully sent to ${chatId}`);
          return { status: "sent", chatId };
        } catch (error: any) {
          const errorMsg = String(error?.message || error).toLowerCase();
          const errorString = String(error || "");

          if (
            errorMsg.includes("not registered") ||
            errorMsg.includes("invalid number") ||
            errorMsg.includes("number not on whatsapp") ||
            errorMsg.includes("phone number not registered") ||
            errorMsg.includes("chat not found") ||
            errorString.includes("WidFactory") ||
            errorString.includes("getChat")
          ) {
            console.log(
              `Skipping ${chatId} - not registered on WhatsApp or invalid number`
            );
            return { status: "skipped", chatId };
          }
          console.error(
            `Failed to send to ${chatId}:`,
            error?.message || error
          );
          return { status: "failed", chatId, error: error?.message };
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
        message:
          error instanceof Error ? error.message : "Failed to parse Excel file",
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

        const result = await sendBatchMessages(
          phoneNumbers,
          message.trim(),
          broadcast
        );

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
