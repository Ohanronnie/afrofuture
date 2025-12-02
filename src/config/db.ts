import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
  try {
    console.log("[DEBUG] Connecting to database...");
    const mongoUri =
      process.env.MONGO_URI ||
      env.databaseUrl ||
      "mongodb://localhost:27017/ticket-bot";
    console.log(
      `[DEBUG] MongoDB URI: ${mongoUri.replace(/\/\/.*@/, "//***@")}`
    ); // Hide credentials
    console.log("[DEBUG] Attempting MongoDB connection...");
    const conn = await mongoose.connect(mongoUri);
    console.log(`[DEBUG] MongoDB connection established`);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[DEBUG] Database connection error:`, error);
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
};
