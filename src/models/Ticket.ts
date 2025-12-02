import mongoose from "mongoose";

export interface ITicket extends mongoose.Document {
  name: string;
  type: string; // Unique identifier like "GA", "VIP", "VVIP", etc.
  description: string;
  price: number;
  totalQuantity: number;
  sold: number;
  available: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  sold: {
    type: Number,
    default: 0,
    min: 0,
  },
  available: {
    type: Number,
    default: function (this: ITicket) {
      return this.totalQuantity - this.sold;
    },
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Calculate available before save
ticketSchema.pre("save", function () {
  this.updatedAt = new Date();
  this.available = this.totalQuantity - this.sold;
});

// Virtual for available tickets
ticketSchema.virtual("availableTickets").get(function () {
  return this.totalQuantity - this.sold;
});

export const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);
