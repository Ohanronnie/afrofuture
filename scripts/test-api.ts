#!/usr/bin/env bun
/**
 * API Test Script
 * Tests all API endpoints and saves results to progress.json
 *
 * Usage: bun run scripts/test-api.ts
 *
 * Environment variables needed:
 * - BASE_URL (default: http://localhost:3000)
 * - ADMIN_EMAIL 
 * - ADMIN_PASSWORD
 */

import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  expectedFailure?: boolean; // True if this is an error test that should fail
  response?: any;
  error?: string;
  timestamp: string;
  duration?: number;
}

interface TestProgress {
  startTime: string;
  lastUpdate: string;
  token?: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    expectedFailures: number;
    unexpectedFailures: number;
  };
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const PROGRESS_FILE = join(process.cwd(), "progress.json");

let progress: TestProgress = {
  startTime: new Date().toISOString(),
  lastUpdate: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    expectedFailures: 0,
    unexpectedFailures: 0,
  },
};

// Load existing progress if available
async function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    try {
      const data = await readFile(PROGRESS_FILE, "utf-8");
      progress = JSON.parse(data);
      console.log("📂 Loaded existing progress file\n");
    } catch (error) {
      console.log("⚠️  Could not load progress file, starting fresh\n");
    }
  }
}

// Save progress to file
async function saveProgress() {
  progress.lastUpdate = new Date().toISOString();
  await writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Make API request
async function makeRequest(
  method: string,
  endpoint: string,
  body?: any,
  token?: string
): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    const duration = Date.now() - startTime;
    const success = response.ok;

    return {
      endpoint,
      method,
      status: response.status,
      success,
      response: data,
      timestamp: new Date().toISOString(),
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      endpoint,
      method,
      status: 0,
      success: false,
      error: error.message || "Request failed",
      timestamp: new Date().toISOString(),
      duration,
    };
  }
}

// Run a test and save progress
async function runTest(
  name: string,
  method: string,
  endpoint: string,
  body?: any,
  token?: string,
  expectedFailure: boolean = false
) {
  console.log(`🧪 Testing: ${name}...`);
  const result = await makeRequest(method, endpoint, body, token);
  result.expectedFailure = expectedFailure;

  progress.tests.push(result);
  progress.summary.total++;

  if (result.success) {
    if (expectedFailure) {
      // This was supposed to fail but succeeded - unexpected
      progress.summary.unexpectedFailures++;
      console.log(`   ⚠️  ${result.status} - Expected failure but succeeded!`);
    } else {
      progress.summary.passed++;
      console.log(`   ✅ ${result.status} - ${result.duration}ms`);
    }
  } else {
    if (expectedFailure) {
      // Expected failure - this is good!
      progress.summary.expectedFailures++;
      const errorMsg = result.error || result.response?.message || "Failed";
      console.log(`   ✓ ${result.status} - Correctly rejected: ${errorMsg}`);
    } else {
      progress.summary.failed++;
      progress.summary.unexpectedFailures++;
      console.log(
        `   ❌ ${result.status} - ${
          result.error || result.response?.message || "Failed"
        }`
      );
    }
  }

  await saveProgress();
  return result;
}

// Main test function
async function runTests() {
  console.log("🚀 Starting API Tests\n");
  console.log(`📍 Base URL: ${BASE_URL}\n`);

  // Check credentials
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      "❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment"
    );
    process.exit(1);
  }

  await loadProgress();

  let token = progress.token;

  // Test 1: Admin Login
  console.log("\n📋 Authentication Tests");
  console.log("=".repeat(50));
  const loginResult = await runTest("Admin Login", "POST", "/admin/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (loginResult.success && loginResult.response?.data?.token) {
    token = loginResult.response.data.token;
    progress.token = token;
    await saveProgress();
    console.log("   🔑 Token obtained and saved\n");
  } else {
    console.error(
      "   ❌ Failed to get token. Cannot continue with authenticated tests.\n"
    );
    return;
  }

  // Test 2-4: User Management
  console.log("\n📋 User Management Tests");
  console.log("=".repeat(50));
  await runTest(
    "Get All Users",
    "GET",
    "/admin/users?page=1&limit=10",
    undefined,
    token
  );
  await runTest("Get User Stats", "GET", "/users/stats", undefined);
  await runTest(
    "Get Users (Public)",
    "GET",
    "/users?page=1&limit=10",
    undefined
  );

  // Test 5-7: Ticket Management
  console.log("\n📋 Ticket Management Tests");
  console.log("=".repeat(50));
  await runTest("Get All Tickets", "GET", "/admin/tickets", undefined, token);

  // Create a test ticket
  const createTicketResult = await runTest(
    "Create Test Ticket",
    "POST",
    "/admin/tickets",
    {
      name: "Test Ticket",
      type: "TEST",
      description: "This is a test ticket created by API test script",
      price: 100.0,
      totalQuantity: 10,
    },
    token
  );

  if (createTicketResult.success && createTicketResult.response?.data?.id) {
    const ticketId = createTicketResult.response.data.id;
    await runTest(
      "Get Ticket by ID",
      "GET",
      `/admin/tickets/${ticketId}`,
      undefined,
      token
    );
    await runTest(
      "Get Ticket by Type",
      "GET",
      "/admin/tickets/TEST",
      undefined,
      token
    );

    // Update the ticket
    await runTest(
      "Update Ticket",
      "PUT",
      `/admin/tickets/${ticketId}`,
      {
        price: 150.0,
        totalQuantity: 20,
      },
      token
    );

    // Delete the test ticket
    await runTest(
      "Delete Test Ticket",
      "DELETE",
      `/admin/tickets/${ticketId}`,
      undefined,
      token
    );
  }

  // Test 8-10: Payment Dashboard
  console.log("\n📋 Payment Dashboard Tests");
  console.log("=".repeat(50));
  await runTest(
    "Get Payment Dashboard",
    "GET",
    "/admin/payments/dashboard",
    undefined,
    token
  );
  await runTest(
    "Get Payment History",
    "GET",
    "/admin/payments/history?page=1&limit=10",
    undefined,
    token
  );
  await runTest(
    "Get Payment Statistics",
    "GET",
    "/admin/payments/statistics",
    undefined,
    token
  );

  // Test 11-12: Broadcast
  console.log("\n📋 Broadcast Tests");
  console.log("=".repeat(50));
  await runTest(
    "Get Recent Broadcasts",
    "GET",
    "/broadcasts/recent?page=1&limit=10",
    undefined
  );
  await runTest(
    "Get Scheduled Broadcasts",
    "GET",
    "/broadcasts/scheduled",
    undefined
  );

  // Test 13-15: User-specific tests (skip if no users exist)
  console.log("\n📋 User-Specific Tests");
  console.log("=".repeat(50));

  // Try to get a real user first
  const usersResult = await makeRequest(
    "GET",
    "/admin/users?limit=1",
    undefined,
    token
  );
  let testChatId: string | null = null;

  if (usersResult.success && usersResult.response?.data?.users?.length > 0) {
    testChatId = usersResult.response.data.users[0].chatId;
    console.log(`   ℹ️  Using real user: ${testChatId}\n`);
  } else {
    console.log("   ⚠️  No users found, skipping user-specific tests\n");
  }

  if (testChatId) {
    // Test 13: Generate Payment Link
    console.log("📋 Payment Link Tests");
    console.log("=".repeat(50));
    await runTest(
      "Generate Payment Link",
      "POST",
      "/admin/payment-link",
      {
        chatId: testChatId,
        amount: 100.0,
        ticketType: "GA",
        paymentType: "full",
      },
      token
    );

    // Test 14: Send Message
    console.log("\n📋 Message Tests");
    console.log("=".repeat(50));
    await runTest(
      "Send Message",
      "POST",
      "/admin/send-message",
      {
        chatId: testChatId,
        message: "This is a test message from API test script",
      },
      token
    );

    // Test 15: Get User Info
    console.log("\n📋 User Info Tests");
    console.log("=".repeat(50));
    await runTest(
      "Get User Info",
      "GET",
      `/admin/users/${testChatId}`,
      undefined,
      token
    );
  }

  // Test 16-30: Error Handling & Validation Tests
  console.log("\n📋 Error Handling & Validation Tests");
  console.log("=".repeat(50));

  // Invalid authentication (expected failures)
  await runTest(
    "Login with Invalid Email",
    "POST",
    "/admin/login",
    {
      email: "invalid-email",
      password: ADMIN_PASSWORD,
    },
    undefined,
    true // Expected to fail
  );

  await runTest(
    "Login with Wrong Password",
    "POST",
    "/admin/login",
    {
      email: ADMIN_EMAIL,
      password: "wrong-password-12345",
    },
    undefined,
    true // Expected to fail
  );

  await runTest(
    "Login with Missing Fields",
    "POST",
    "/admin/login",
    {
      email: ADMIN_EMAIL,
    },
    undefined,
    true // Expected to fail
  );

  // Invalid ticket operations (expected failures)
  await runTest(
    "Create Ticket with Missing Fields",
    "POST",
    "/admin/tickets",
    {
      name: "Incomplete Ticket",
    },
    token,
    true // Expected to fail
  );

  await runTest(
    "Create Ticket with Invalid Price",
    "POST",
    "/admin/tickets",
    {
      name: "Invalid Price Ticket",
      type: "INVALID1",
      description: "Test",
      price: -100,
      totalQuantity: 10,
    },
    token,
    true // Expected to fail
  );

  await runTest(
    "Create Ticket with Invalid Quantity",
    "POST",
    "/admin/tickets",
    {
      name: "Invalid Qty Ticket",
      type: "INVALID2",
      description: "Test",
      price: 100,
      totalQuantity: -5,
    },
    token,
    true // Expected to fail
  );

  await runTest(
    "Create Ticket with Duplicate Type",
    "POST",
    "/admin/tickets",
    {
      name: "Duplicate Type",
      type: "GA", // Assuming GA already exists
      description: "Test",
      price: 100,
      totalQuantity: 10,
    },
    token,
    true // Expected to fail
  );

  await runTest(
    "Get Ticket with Invalid ID",
    "GET",
    "/admin/tickets/invalid-id-12345",
    undefined,
    token,
    true // Expected to fail (404)
  );

  await runTest(
    "Get Ticket with Non-existent Type",
    "GET",
    "/admin/tickets/NONEXISTENT",
    undefined,
    token,
    true // Expected to fail (404)
  );

  await runTest(
    "Update Ticket with Invalid ID",
    "PUT",
    "/admin/tickets/invalid-id-12345",
    {
      price: 200,
    },
    token,
    true // Expected to fail (404)
  );

  await runTest(
    "Update Ticket with Invalid Data",
    "PUT",
    "/admin/tickets/GA",
    {
      price: -50,
      totalQuantity: "not-a-number",
    },
    token,
    true // Expected to fail
  );

  await runTest(
    "Delete Ticket with Invalid ID",
    "DELETE",
    "/admin/tickets/invalid-id-12345",
    undefined,
    token,
    true // Expected to fail (404)
  );

  // Invalid user operations (expected failures)
  await runTest(
    "Get User with Invalid ChatId",
    "GET",
    "/admin/users/invalid-chat-id",
    undefined,
    token,
    true // Expected to fail (404)
  );

  await runTest(
    "Generate Payment Link with Missing Fields",
    "POST",
    "/admin/payment-link",
    {
      chatId: "test@c.us",
    },
    token,
    true // Expected to fail
  );

  await runTest(
    "Generate Payment Link with Invalid Amount",
    "POST",
    "/admin/payment-link",
    {
      chatId: "test@c.us",
      amount: -100,
    },
    token,
    true // Expected to fail
  );

  await runTest(
    "Send Message with Missing Fields",
    "POST",
    "/admin/send-message",
    {
      chatId: "test@c.us",
    },
    token,
    true // Expected to fail
  );

  await runTest(
    "Send Message with Empty Message",
    "POST",
    "/admin/send-message",
    {
      chatId: "test@c.us",
      message: "",
    },
    token,
    true // Expected to fail
  );

  // Invalid query parameters (expected failures or edge cases)
  await runTest(
    "Get Users with Invalid Page",
    "GET",
    "/admin/users?page=-1&limit=10",
    undefined,
    token,
    false // May still work (defaults to page 1)
  );

  await runTest(
    "Get Users with Invalid Limit",
    "GET",
    "/admin/users?page=1&limit=abc",
    undefined,
    token,
    false // May still work (defaults to limit 20)
  );

  await runTest(
    "Get Payment History with Invalid Page",
    "GET",
    "/admin/payments/history?page=999999&limit=10",
    undefined,
    token,
    false // May return empty results
  );

  // Unauthorized access tests (expected failures)
  await runTest(
    "Access Admin Route without Token",
    "GET",
    "/admin/users",
    undefined,
    undefined,
    true // Expected to fail (401)
  );

  await runTest(
    "Access Admin Route with Invalid Token",
    "GET",
    "/admin/users",
    undefined,
    "invalid-token-12345",
    true // Expected to fail (401)
  );

  await runTest(
    "Access Admin Route with Expired Token Format",
    "GET",
    "/admin/tickets",
    undefined,
    "Bearer invalid.jwt.token",
    true // Expected to fail (401)
  );

  // Invalid broadcast operations (expected failures)
  await runTest(
    "Create Broadcast with Missing Message",
    "POST",
    "/broadcast",
    {
      filter: "all",
    },
    undefined,
    true // Expected to fail
  );

  await runTest(
    "Create Broadcast with Invalid Filter",
    "POST",
    "/broadcast",
    {
      message: "Test message",
      filter: "invalid-filter",
    },
    undefined,
    true // Expected to fail
  );

  await runTest(
    "Create Broadcast with Invalid Schedule Time",
    "POST",
    "/broadcast",
    {
      message: "Test message",
      scheduleTime: "not-a-valid-date",
    },
    undefined,
    true // Expected to fail
  );

  // Invalid payment operations (expected failures)
  await runTest(
    "Payment Callback with Missing Reference",
    "GET",
    "/api/payments/callback",
    undefined,
    undefined,
    true // Expected to fail (400)
  );

  await runTest(
    "Payment Callback with Invalid Reference",
    "GET",
    "/api/payments/callback?reference=invalid-ref-123",
    undefined,
    undefined,
    false // May return error but not necessarily 400
  );

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Summary");
  console.log("=".repeat(50));
  console.log(`Total Tests: ${progress.summary.total}`);
  console.log(`✅ Passed: ${progress.summary.passed}`);
  console.log(
    `✓ Expected Failures (Correctly Rejected): ${progress.summary.expectedFailures}`
  );
  console.log(`❌ Unexpected Failures: ${progress.summary.unexpectedFailures}`);
  console.log(
    `❌ Other Failures: ${
      progress.summary.failed - progress.summary.unexpectedFailures
    }`
  );

  const successCount =
    progress.summary.passed + progress.summary.expectedFailures;
  console.log(
    `\nOverall Success Rate: ${(
      (successCount / progress.summary.total) *
      100
    ).toFixed(1)}% (including correctly rejected invalid requests)`
  );
  console.log(`\n📄 Results saved to: ${PROGRESS_FILE}\n`);

  // Note about expected failures
  console.log("ℹ️  Note:");
  console.log(
    "   - ✓ Expected Failures: API correctly rejected invalid requests"
  );
  console.log("   - ✅ Passed: Valid requests succeeded");
  console.log("   - ❌ Unexpected Failures: Issues that need attention\n");
}

// Run tests
runTests().catch((error) => {
  console.error("❌ Test execution failed:", error);
  process.exit(1);
});
