import bcrypt from "bcryptjs";
import { env } from "./env.js";

/**
 * Hash the admin password from environment variable and store it
 * This is called once at startup to prepare the hashed password
 */
let hashedAdminPassword: string | null = null;

export async function initAdminPassword(): Promise<void> {
  if (!env.adminPassword) {
    throw new Error("ADMIN_PASSWORD is not set in environment variables");
  }

  // Hash the password with 10 salt rounds
  hashedAdminPassword = await bcrypt.hash(env.adminPassword, 10);
  console.log("✅ Admin password hashed and ready");
}

export function getHashedAdminPassword(): string {
  if (!hashedAdminPassword) {
    throw new Error(
      "Admin password not initialized. Call initAdminPassword() first."
    );
  }
  return hashedAdminPassword;
}
