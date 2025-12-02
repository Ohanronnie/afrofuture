import type { Request, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Ticket } from "../models/Ticket.js";
import { User } from "../models/User.js";
import { getSession } from "../utils/session.js";
import type { UserSession } from "../types/session.js";

const createTicketSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required").toUpperCase(),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be positive"),
  totalQuantity: z.number().int().positive("Total quantity must be positive"),
});

const updateTicketSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  totalQuantity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

/**
 * Get all tickets with stats
 */
export const getAllTickets = async (req: Request, res: Response) => {
  try {
    const tickets = await Ticket.find({}).sort({ createdAt: -1 });

    // Calculate sold tickets from users
    const ticketsWithStats = await Promise.all(
      tickets.map(async (ticket) => {
        // Count users with this ticket type and a ticket ID (fully paid)
        const soldCount = await User.countDocuments({
          "session.ticketType": ticket.type,
          "session.ticketId": { $exists: true, $ne: null },
        });

        // Update sold count if different
        if (ticket.sold !== soldCount) {
          ticket.sold = soldCount;
          ticket.available = ticket.totalQuantity - soldCount;
          await ticket.save();
        }

        return {
          id: ticket._id,
          name: ticket.name,
          type: ticket.type,
          description: ticket.description,
          price: ticket.price,
          totalQuantity: ticket.totalQuantity,
          sold: ticket.sold,
          available: ticket.available,
          isActive: ticket.isActive,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        };
      })
    );

    res.json({
      status: "success",
      data: {
        tickets: ticketsWithStats,
        count: ticketsWithStats.length,
      },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch tickets",
    });
  }
};

/**
 * Get a single ticket by ID or type
 */
export const getTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Ticket ID or type is required",
      });
    }

    let ticket = null;

    // Check if id is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      // Try to find by ID first
      ticket = await Ticket.findById(id);
    }

    // If not found by ID, try to find by type
    if (!ticket) {
      ticket = await Ticket.findOne({ type: id.toUpperCase() });
    }

    if (!ticket) {
      return res.status(404).json({
        status: "error",
        message: "Ticket not found",
      });
    }

    // Calculate actual sold count
    const soldCount = await User.countDocuments({
      "session.ticketType": ticket.type,
      "session.ticketId": { $exists: true, $ne: null },
    });

    // Update if different
    if (ticket.sold !== soldCount) {
      ticket.sold = soldCount;
      ticket.available = ticket.totalQuantity - soldCount;
      await ticket.save();
    }

    res.json({
      status: "success",
      data: {
        id: ticket._id,
        name: ticket.name,
        type: ticket.type,
        description: ticket.description,
        price: ticket.price,
        totalQuantity: ticket.totalQuantity,
        sold: ticket.sold,
        available: ticket.available,
        isActive: ticket.isActive,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch ticket",
    });
  }
};

/**
 * Create a new ticket
 */
export const createTicket = async (req: Request, res: Response) => {
  try {
    const validatedData = createTicketSchema.parse(req.body);
    const { name, type, description, price, totalQuantity } = validatedData;

    // Check if ticket type already exists
    const existingTicket = await Ticket.findOne({
      type: type.toUpperCase(),
    });
    if (existingTicket) {
      return res.status(400).json({
        status: "error",
        message: `Ticket type "${type.toUpperCase()}" already exists`,
      });
    }

    // Create new ticket
    const ticket = new Ticket({
      name,
      type: type.toUpperCase(),
      description,
      price,
      totalQuantity,
      sold: 0,
      available: totalQuantity,
      isActive: true,
    });

    await ticket.save();

    res.status(201).json({
      status: "success",
      data: {
        id: ticket._id,
        name: ticket.name,
        type: ticket.type,
        description: ticket.description,
        price: ticket.price,
        totalQuantity: ticket.totalQuantity,
        sold: ticket.sold,
        available: ticket.available,
        isActive: ticket.isActive,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
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
        message: "Ticket type already exists",
      });
    }

    console.error("Error creating ticket:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to create ticket",
    });
  }
};

/**
 * Update a ticket
 */
export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateTicketSchema.parse(req.body);

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Ticket ID or type is required",
      });
    }

    let ticket = null;

    // Check if id is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      // Try to find by ID first
      ticket = await Ticket.findById(id);
    }

    // If not found by ID, try to find by type
    if (!ticket) {
      ticket = await Ticket.findOne({ type: id.toUpperCase() });
    }

    if (!ticket) {
      return res.status(404).json({
        status: "error",
        message: "Ticket not found",
      });
    }

    // Update fields
    if (validatedData.name) ticket.name = validatedData.name;
    if (validatedData.description)
      ticket.description = validatedData.description;
    if (validatedData.price !== undefined) ticket.price = validatedData.price;
    if (validatedData.totalQuantity !== undefined) {
      ticket.totalQuantity = validatedData.totalQuantity;
      ticket.available = validatedData.totalQuantity - ticket.sold;
    }
    if (validatedData.isActive !== undefined)
      ticket.isActive = validatedData.isActive;

    await ticket.save();

    res.json({
      status: "success",
      data: {
        id: ticket._id,
        name: ticket.name,
        type: ticket.type,
        description: ticket.description,
        price: ticket.price,
        totalQuantity: ticket.totalQuantity,
        sold: ticket.sold,
        available: ticket.available,
        isActive: ticket.isActive,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
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

    console.error("Error updating ticket:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to update ticket",
    });
  }
};

/**
 * Delete a ticket
 */
export const deleteTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Ticket ID or type is required",
      });
    }

    let ticket = null;

    // Check if id is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      // Try to find by ID first
      ticket = await Ticket.findById(id);
    }

    // If not found by ID, try to find by type
    if (!ticket) {
      ticket = await Ticket.findOne({ type: id.toUpperCase() });
    }

    if (!ticket) {
      return res.status(404).json({
        status: "error",
        message: "Ticket not found",
      });
    }

    // Check if tickets have been sold
    const soldCount = await User.countDocuments({
      "session.ticketType": ticket.type,
      "session.ticketId": { $exists: true, $ne: null },
    });

    if (soldCount > 0) {
      return res.status(400).json({
        status: "error",
        message: `Cannot delete ticket. ${soldCount} ticket(s) have been sold. Deactivate instead.`,
      });
    }

    await Ticket.findByIdAndDelete(ticket._id);

    res.json({
      status: "success",
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete ticket",
    });
  }
};
