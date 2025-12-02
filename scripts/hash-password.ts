#!/usr/bin/env bun
/**
 * Utility script to hash admin password
 * Usage: bun run scripts/hash-password.ts <password>
 */

import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("Usage: bun run scripts/hash-password.ts <password>");
  process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log("\n✅ Password hashed successfully!\n");
console.log("Add this to your .env file:");
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
