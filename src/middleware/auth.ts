import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AdminPayload {
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT authentication middleware for admin routes
 * Expects Bearer token: Authorization: Bearer <token>
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required. Please provide a valid JWT token.",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token format",
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, env.jwtSecret) as AdminPayload;
      (req as any).admin = { email: decoded.email };
      next();
    } catch (error) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      status: "error",
      message: "Authentication failed",
    });
  }
};
