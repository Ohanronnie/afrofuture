import type { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin.js";

const createAdminSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["super_admin", "admin"]).default("admin"),
});

const updateAdminSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["super_admin", "admin"]).optional(),
});

/**
 * Get current admin info
 */
export const getCurrentAdmin = async (req: Request, res: Response) => {
  try {
    const adminEmail = (req as any).admin?.email;
    if (!adminEmail) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const admin = await Admin.findOne({ email: adminEmail }).select("-password");
    if (!admin) {
      return res.status(404).json({
        status: "error",
        message: "Admin not found",
      });
    }

    res.json({
      status: "success",
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin info:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch admin info",
    });
  }
};

/**
 * Get all admins (Admin only)
 */
export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await Admin.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      status: "success",
      data: {
        admins: admins.map((admin) => ({
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch admins",
    });
  }
};

/**
 * Create new admin (Super Admin only)
 */
export const createAdmin = async (req: Request, res: Response) => {
  try {
    const currentAdmin = (req as any).admin;
    
    // Check if current admin is super_admin
    const admin = await Admin.findOne({ email: currentAdmin.email });
    if (!admin || admin.role !== "super_admin") {
      return res.status(403).json({
        status: "error",
        message: "Only super admins can create new admins",
      });
    }

    const validatedData = createAdminSchema.parse(req.body);
    const { email, password, name, role } = validatedData;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        status: "error",
        message: "Admin with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const newAdmin = await Admin.create({
      email,
      password: hashedPassword,
      name,
      role: role || "admin",
      isActive: true,
      createdBy: admin._id,
    });

    res.status(201).json({
      status: "success",
      data: {
        admin: {
          id: newAdmin._id,
          email: newAdmin.email,
          name: newAdmin.name,
          role: newAdmin.role,
          isActive: newAdmin.isActive,
          createdAt: newAdmin.createdAt,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: error.issues,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        status: "error",
        message: "Admin with this email already exists",
      });
    }

    console.error("Error creating admin:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to create admin",
    });
  }
};

/**
 * Update admin (Super Admin only, or self)
 */
export const updateAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentAdmin = (req as any).admin;
    
    const admin = await Admin.findOne({ email: currentAdmin.email });
    if (!admin) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    // Check permissions: super_admin can update anyone, regular admin can only update self
    const targetAdmin = await Admin.findById(id);
    if (!targetAdmin) {
      return res.status(404).json({
        status: "error",
        message: "Admin not found",
      });
    }

    if (admin.role !== "super_admin" && targetAdmin._id.toString() !== admin._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "You can only update your own account",
      });
    }

    const validatedData = updateAdminSchema.parse(req.body);
    const updateData: any = {};

    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.email) updateData.email = validatedData.email;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    if (validatedData.role && admin.role === "super_admin") {
      updateData.role = validatedData.role;
    }
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 10);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      status: "success",
      data: {
        admin: {
          id: updatedAdmin!._id,
          email: updatedAdmin!.email,
          name: updatedAdmin!.name,
          role: updatedAdmin!.role,
          isActive: updatedAdmin!.isActive,
          updatedAt: updatedAdmin!.updatedAt,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: error.issues,
      });
    }

    console.error("Error updating admin:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to update admin",
    });
  }
};

/**
 * Delete admin (Super Admin only)
 */
export const deleteAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentAdmin = (req as any).admin;
    
    const admin = await Admin.findOne({ email: currentAdmin.email });
    if (!admin || admin.role !== "super_admin") {
      return res.status(403).json({
        status: "error",
        message: "Only super admins can delete admins",
      });
    }

    // Prevent deleting self
    if (admin._id.toString() === id) {
      return res.status(400).json({
        status: "error",
        message: "You cannot delete your own account",
      });
    }

    await Admin.findByIdAndDelete(id);

    res.json({
      status: "success",
      data: {
        message: "Admin deleted successfully",
      },
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete admin",
    });
  }
};

