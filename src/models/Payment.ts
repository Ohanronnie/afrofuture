import mongoose from "mongoose";

export interface IPayment extends mongoose.Document {
  userId: string;
  chatId: string;
  amount: number;
  currency: string;
  paystackReference: string;
  paystackAccessCode?: string;
  status: "pending" | "success" | "failed" | "abandoned";
  ticketType?: "GA" | "VIP";
  paymentType?: "full" | "installment";
  installmentNumber?: number;
  metadata?: Record<string, any>;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  chatId: {
    type: String,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "GHS",
  },
  paystackReference: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  paystackAccessCode: {
    type: String,
  },
  status: {
    type: String,
    enum: ["pending", "success", "failed", "abandoned"],
    default: "pending",
    index: true,
  },
  ticketType: {
    type: String,
    enum: ["GA", "VIP"],
  },
  paymentType: {
    type: String,
    enum: ["full", "installment"],
  },
  installmentNumber: {
    type: Number,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  paidAt: {
    type: Date,
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

paymentSchema.pre("save", function () {
  this.updatedAt = new Date();
});

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
