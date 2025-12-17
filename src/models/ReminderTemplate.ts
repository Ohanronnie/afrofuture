import mongoose, { Schema, Document } from "mongoose";

export interface IReminderTemplate extends Document {
  name: string;
  description?: string;
  type: "payment_due" | "custom";
  triggerDays?: number; // Days before due date (e.g., 5 for 5-day reminder, 1 for 1-day reminder)
  messageTemplate: string; // Template with variables like {{amount}}, {{daysLeft}}, {{paymentLink}}, {{dueDate}}, {{userName}}
  isActive: boolean;
  filter?: "all" | "paid" | "pending"; // Filter for who receives this reminder
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const reminderTemplateSchema = new Schema<IReminderTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["payment_due", "custom"],
      required: true,
      default: "payment_due",
    },
    triggerDays: {
      type: Number,
      min: 0,
      // Only required for payment_due type
    },
    messageTemplate: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    filter: {
      type: String,
      enum: ["all", "paid", "pending"],
      default: "pending",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reminderTemplateSchema.index({ type: 1, triggerDays: 1 });
reminderTemplateSchema.index({ isActive: 1 });

export const ReminderTemplate = mongoose.model<IReminderTemplate>(
  "ReminderTemplate",
  reminderTemplateSchema
);
