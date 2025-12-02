import type { Client } from "whatsapp-web.js";
import { env } from "../config/env.js";
import { logError } from "../errors/errorHandler.js";
import { checkReminders } from "./reminders.js";
import { checkDeadlines } from "./deadlines.js";

export function initializeSchedulers(client: Client): void {
  console.log("⏰ Starting automated schedulers...\n");

  // Check for reminders every 6 hours (default)
  setInterval(async () => {
    try {
      await checkReminders(client);
    } catch (error) {
      logError(error, "reminder scheduler");
    }
  }, env.reminderCheckInterval);

  // Check for deadlines once per day (default)
  setInterval(async () => {
    try {
      await checkDeadlines(client);
    } catch (error) {
      logError(error, "deadline scheduler");
    }
  }, env.deadlineCheckInterval);

  // Run initial checks after 5 seconds
  setTimeout(() => {
    console.log("🔄 Running initial scheduler checks...\n");
    checkReminders(client).catch((err) =>
      logError(err, "initial reminder check")
    );
    checkDeadlines(client).catch((err) =>
      logError(err, "initial deadline check")
    );
  }, 5000);

  console.log("✅ Schedulers initialized successfully!");
  console.log(
    `   - Reminders: Every ${env.reminderCheckInterval / 1000 / 60 / 60} hours`
  );
  console.log(
    `   - Deadlines: Every ${
      env.deadlineCheckInterval / 1000 / 60 / 60
    } hours\n`
  );
}
