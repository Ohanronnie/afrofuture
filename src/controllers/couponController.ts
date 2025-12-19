import type { Request, Response } from "express";
import { z } from "zod";
import { Coupon } from "../models/Coupon.js";

const createCouponSchema = z.object({
  code: z.string().min(1, "Code is required").toUpperCase(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().positive("Value must be positive"),
  maxUsage: z.number().int().positive().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
});

const updateCouponSchema = z.object({
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  maxUsage: z.number().int().positive().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
});

/**
 * Get all coupons
 */
export const getAllCoupons = async (req: Request, res: Response) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });

    res.json({
      status: "success",
      data: {
        coupons,
        count: coupons.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch coupons",
    });
  }
};

/**
 * Create a new coupon
 */
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const validatedData = createCouponSchema.parse(req.body);
    const { code } = validatedData;

    const existing = await Coupon.findOne({ code });
    if (existing) {
      return res.status(400).json({
        status: "error",
        message: `Coupon code "${code}" already exists`,
      });
    }

    const coupon = new Coupon(validatedData);
    await coupon.save();

    res.status(201).json({
      status: "success",
      data: { coupon },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: error.issues,
      });
    }

    console.error("Error creating coupon:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to create coupon",
    });
  }
};

/**
 * Update a coupon
 */
export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateCouponSchema.parse(req.body);

    const coupon = await Coupon.findByIdAndUpdate(id, validatedData, {
      new: true,
    });

    if (!coupon) {
      return res.status(404).json({
        status: "error",
        message: "Coupon not found",
      });
    }

    res.json({
      status: "success",
      data: { coupon },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: error.issues,
      });
    }

    console.error("Error updating coupon:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to update coupon",
    });
  }
};

/**
 * Delete a coupon
 */
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({
        status: "error",
        message: "Coupon not found",
      });
    }

    res.json({
      status: "success",
      message: "Coupon deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete coupon",
    });
  }
};
