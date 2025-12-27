import { Client, LocalAuth } from "whatsapp-web.js";

// Store QR code securely in memory (not exposed in logs)
let currentQRCode: string | null = null;

/**
 * Get the current QR code (for admin access only)
 * Returns null if no QR code is available (client is authenticated)
 */
export function getQRCode(): string | null {
  return currentQRCode;
}

/**
 * Clear the stored QR code (called after authentication)
 */
export function clearQRCode(): void {
  currentQRCode = null;
}

// Initialize WhatsApp client
export const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: ".wwebjs_auth",
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  },
});

// Debug: Log all client events
console.log("[DEBUG] Setting up WhatsApp client event listeners...");

// QR Code for authentication - Store securely instead of displaying
client.on("qr", (qr) => {
  console.log("[DEBUG] QR code event received");
  // Store QR code securely (not displayed in console/logs)
  currentQRCode = qr;
  console.log("🔳 QR code generated. Access it securely through the admin dashboard.");
});

// Loading screen
client.on("loading_screen", (percent, message) => {
  console.log(`[DEBUG] Loading: ${percent}% - ${message}`);
});

// Client ready - Clear QR code when client becomes ready
client.on("ready", async () => {
  console.log("[DEBUG] Client ready event fired");
  console.log("✅ AfroFuture 2025 Bot is ready!");
  clearQRCode(); // Clear QR code when client is ready

  // Set the bot's display name
  try {
    await client.setDisplayName("AfroFuture Bot🤖");
    console.log("✅ Bot display name set to 'AfroFuture Bot🤖'");
    
    // Verify the display name was set
    try {
      const info = await client.info;
      if (info?.pushname) {
        console.log(`✅ Verified display name: ${info.pushname}`);
      }
    } catch (verifyError) {
      console.log("⚠️  Could not verify display name (this is normal)");
    }
  } catch (error) {
    console.error("⚠️  Failed to set bot display name:", error);
  }

  console.log("📱 Waiting for messages...\n");
});

// Handle authentication - Clear QR code after successful auth
client.on("authenticated", () => {
  console.log("[DEBUG] Authenticated event fired");
  console.log("✅ Authenticated successfully!");
  clearQRCode(); // Clear QR code after authentication
});

client.on("auth_failure", (msg) => {
  console.error("[DEBUG] Auth failure event fired");
  console.error("❌ Authentication failed:", msg);
});

// Additional debug events
client.on("change_state", (state) => {
  console.log(`[DEBUG] State changed: ${state}`);
});

client.on("disconnected", (reason) => {
  console.log(`[DEBUG] Disconnected event fired: ${reason}`);
  console.log("⚠️  Client disconnected:", reason);
});

client.on("remote_session_saved", () => {
  console.log("[DEBUG] Remote session saved event fired");
  console.log("💾 Remote session saved");
});

// Error handling
client.on("error", async (error) => {
  console.error("[DEBUG] Client error event fired");
  console.error("❌ WhatsApp client error:", error);
  
  const errorMsg = String(error?.message || error || "").toLowerCase();
  if (
    errorMsg.includes("registrationutils") ||
    errorMsg.includes("widfactory") ||
    errorMsg.includes("getchat") ||
    errorMsg.includes("evaluation failed")
  ) {
    console.log("⚠️  Critical WhatsApp Web.js error detected. Attempting recovery...");
    try {
      await client.destroy();
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log("🔄 Reinitializing WhatsApp client...");
      await client.initialize();
    } catch (recoveryError) {
      console.error("❌ Recovery failed:", recoveryError);
      console.log("💡 You may need to restart the bot manually or clear cache");
    }
  }
});

// Log when client is being initialized
console.log("[DEBUG] WhatsApp client instance created");
