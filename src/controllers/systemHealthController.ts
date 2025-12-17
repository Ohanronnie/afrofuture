import type { Request, Response } from "express";
import mongoose from "mongoose";
import { client } from "../config/client.js";
import { env } from "../config/env.js";
import axios from "axios";

/**
 * Get system health status
 * Checks WhatsApp API, Payment Gateway, Database, and Email Service
 */
export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const healthChecks = await Promise.allSettled([
      checkWhatsAppStatus(),
      checkPaymentGatewayStatus(),
      checkDatabaseStatus(),
      checkEmailServiceStatus(),
    ]);

    const services = [
      {
        service: "WhatsApp API",
        status:
          healthChecks[0].status === "fulfilled"
            ? healthChecks[0].value.status
            : "down",
        lastChecked: new Date(),
        details:
          healthChecks[0].status === "fulfilled"
            ? healthChecks[0].value.details
            : "Service unavailable",
      },
      {
        service: "Payment Gateway",
        status:
          healthChecks[1].status === "fulfilled"
            ? healthChecks[1].value.status
            : "down",
        lastChecked: new Date(),
        details:
          healthChecks[1].status === "fulfilled"
            ? healthChecks[1].value.details
            : "Service unavailable",
      },
      {
        service: "Database",
        status:
          healthChecks[2].status === "fulfilled"
            ? healthChecks[2].value.status
            : "down",
        lastChecked: new Date(),
        details:
          healthChecks[2].status === "fulfilled"
            ? healthChecks[2].value.details
            : "Service unavailable",
      },
      {
        service: "Email Service",
        status:
          healthChecks[3].status === "fulfilled"
            ? healthChecks[3].value.status
            : "degraded",
        lastChecked: new Date(),
        details:
          healthChecks[3].status === "fulfilled"
            ? healthChecks[3].value.details
            : "Not configured",
      },
    ];

    res.json({
      status: "success",
      data: {
        services,
        overallStatus: services.every((s) => s.status === "operational")
          ? "operational"
          : services.some((s) => s.status === "down")
          ? "down"
          : "degraded",
      },
    });
  } catch (error) {
    console.error("Error checking system health:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to check system health",
    });
  }
};

async function checkWhatsAppStatus(): Promise<{
  status: string;
  details: string;
}> {
  try {
    // Check if client is ready
    let state: string;
    try {
      state = client.info ? "READY" : (await client.getState()).toString();
    } catch (error) {
      state = "UNKNOWN";
    }

    if (state === "READY" || state === "CONNECTED") {
      return {
        status: "operational",
        details: "WhatsApp client is connected and ready",
      };
    } else if (state === "CONNECTING" || state === "OPENING") {
      return {
        status: "degraded",
        details: "WhatsApp client is connecting",
      };
    } else {
      return {
        status: "down",
        details: `WhatsApp client state: ${state}`,
      };
    }
  } catch (error) {
    return {
      status: "down",
      details: "WhatsApp client error",
    };
  }
}

async function checkPaymentGatewayStatus(): Promise<{
  status: string;
  details: string;
}> {
  try {
    // Check Paystack API status
    if (!env.paystackSecretKey) {
      return {
        status: "down",
        details: "Paystack secret key not configured",
      };
    }

    // Try to verify API key by making a test request
    const response = await axios.get("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer ${env.paystackSecretKey}`,
      },
      timeout: 5000,
    });

    if (response.status === 200) {
      return {
        status: "operational",
        details: "Paystack API is operational",
      };
    } else {
      return {
        status: "degraded",
        details: "Paystack API returned unexpected status",
      };
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      return {
        status: "down",
        details: "Invalid Paystack API key",
      };
    }
    return {
      status: "degraded",
      details: "Paystack API check failed",
    };
  }
}

async function checkDatabaseStatus(): Promise<{
  status: string;
  details: string;
}> {
  try {
    const connectionState = mongoose.connection.readyState;

    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (connectionState === 1) {
      // Test with a simple query
      await mongoose.connection.db?.admin().ping();
      return {
        status: "operational",
        details: "Database is connected and responsive",
      };
    } else if (connectionState === 2) {
      return {
        status: "degraded",
        details: "Database is connecting",
      };
    } else {
      return {
        status: "down",
        details: "Database is disconnected",
      };
    }
  } catch (error) {
    return {
      status: "down",
      details: "Database connection error",
    };
  }
}

async function checkEmailServiceStatus(): Promise<{
  status: string;
  details: string;
}> {
  // Email service is not implemented yet, so return degraded
  return {
    status: "degraded",
    details: "Email service not configured",
  };
}
