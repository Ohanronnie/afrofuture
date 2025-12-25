import type { Message } from "whatsapp-web.js";
import { client } from "./src/config/client.js";
import { handleMessage } from "./src/handlers/message.js";
import { initializeSchedulers } from "./src/schedulers/index.js";
import { handleError } from "./src/errors/errorHandler.js";
import { startServer } from "./src/server.js";
import { connectDB } from "./src/config/db.js";
import {
  validateEnv,
  printEnvValidationErrors,
} from "./src/config/validateEnv.js";
import { initAdminPassword } from "./src/config/initAdmin.js";

// Validate environment variables before starting
console.log("🔍 Validating environment variables...\n");
const validation = validateEnv();

if (!validation.valid) {
  printEnvValidationErrors(validation.errors);
  process.exit(1);
}

console.log("✅ All required environment variables are set!\n");

// Initialize admin password (hash it)
try {
  await initAdminPassword();
} catch (error) {
  console.error("❌ Failed to initialize admin password:", error);
  process.exit(1);
}

// Connect to Database
connectDB();

// Message handler
client.on("message", async (message: Message) => {
  try {
    console.log("[DEBUG] Message event received");
    const chatId = message.from;
    console.log(`[DEBUG] Chat ID: ${chatId}`);

    // Safely derive contact / name without relying on broken getContact internals
    let contactName =
      (message as any)._data?.notifyName ||
      (message as any)._data?.pushname ||
      (message as any)._data?.sender?.name ||
      chatId;

    console.log(`[DEBUG] Contact retrieved (fallback): ${contactName}`);

    // Optionally try to enrich with getContact, but don't let it crash the handler
    try {
      const contact = await message.getContact();
      contactName =
        (contact as any).pushname || (contact as any).name || contactName;
      console.log(
        `[DEBUG] Contact retrieved via getContact: ${
          (contact as any).pushname || (contact as any).name
        }`
      );
    } catch (contactError) {
      console.error(
        "[DEBUG] message.getContact() failed, using fallback contact data",
        contactError
      );
    }

    const userName = contactName || "there";
    const userMessage = message.body.trim();
    console.log(`[DEBUG] Message body: ${userMessage}`);

    console.log(`📩 Message from ${userName}: ${userMessage}`);
    console.log("[DEBUG] Calling handleMessage...");

    await handleMessage(message, chatId, userName, userMessage);
    console.log("[DEBUG] handleMessage completed");
  } catch (error) {
    console.error("[DEBUG] Error in message handler:", error);
    console.error("❌ Failed to process message:", error);
  }
});

// Initialize schedulers when client is ready
client.on("ready", async () => {
  console.log("[DEBUG] Ready event - initializing schedulers...");
  try {
    initializeSchedulers(client);
    console.log("[DEBUG] Schedulers initialized");
  } catch (error) {
    console.error("[DEBUG] Error initializing schedulers:", error);
  }
  
  // Ensure display name is set on ready/reconnect
  try {
    await client.setDisplayName("AfroFuture Bot🤖");
    console.log("[DEBUG] Bot display name verified/updated to 'AfroFuture Bot🤖'");
  } catch (error) {
    console.error("[DEBUG] Failed to set display name:", error);
  }
});

// Start the bot
console.log("🚀 Starting AfroFuture 2025 Ticketing Bot...\n");
console.log("[DEBUG] About to initialize WhatsApp client...");

// Handle client errors
client.on("disconnected", (reason) => {
  console.log(`[DEBUG] Disconnected event in index.ts: ${reason}`);
  console.log("⚠️  Client disconnected:", reason);
  console.log("🔄 Attempting to reconnect in 5 seconds...");
  setTimeout(() => {
    console.log("[DEBUG] Attempting reconnection...");
    client.initialize().catch((error) => {
      console.error("[DEBUG] Reconnection error:", error);
      console.error("❌ Reconnection failed:", error);
    });
  }, 5000);
});

client.on("remote_session_saved", () => {
  console.log("[DEBUG] Remote session saved in index.ts");
  console.log("💾 Remote session saved");
});

// Initialize client with error handling
console.log("[DEBUG] Calling client.initialize()...");
try {
  const initPromise = client.initialize();
  console.log("[DEBUG] client.initialize() called, waiting for promise...");

  initPromise
    .then(() => {
      console.log("[DEBUG] Client initialization promise resolved");
    })
    .catch((error) => {
      console.error("[DEBUG] Client initialization promise rejected");
      console.error("❌ Failed to initialize WhatsApp client:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      console.log("\n💡 If you see compatibility errors, try:");
      console.log("   1. Clear the cache: rm -rf .wwebjs_auth .wwebjs_cache");
      console.log("   2. Restart the bot\n");
    });
} catch (error) {
  console.error("[DEBUG] Synchronous error in client.initialize()");
  console.error("❌ Failed to initialize WhatsApp client:", error);
  console.log("\n💡 If you see compatibility errors, try:");
  console.log("   1. Clear the cache: rm -rf .wwebjs_auth .wwebjs_cache");
  console.log("   2. Restart the bot\n");
}

startServer();

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  console.error("Stack:", error.stack);
  
  if (error.message?.includes("RegistrationUtils") || 
      error.message?.includes("WidFactory") ||
      error.message?.includes("getChat")) {
    console.log("⚠️  WhatsApp Web.js internal error detected. Attempting to restart client...");
    setTimeout(async () => {
      try {
        await client.destroy();
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await client.initialize();
      } catch (restartError) {
        console.error("❌ Failed to restart client:", restartError);
      }
    }, 5000);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  
  if (reason && typeof reason === "object" && "message" in reason) {
    const errorMsg = String((reason as any).message || "").toLowerCase();
    if (errorMsg.includes("registrationutils") || 
        errorMsg.includes("widfactory") ||
        errorMsg.includes("getchat")) {
      console.log("⚠️  WhatsApp Web.js internal error detected. Attempting to restart client...");
      setTimeout(async () => {
        try {
          await client.destroy();
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await client.initialize();
        } catch (restartError) {
          console.error("❌ Failed to restart client:", restartError);
        }
      }, 5000);
    }
  }
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⏹️  Shutting down bot...");
  await client.destroy();
  process.exit(0);
});
