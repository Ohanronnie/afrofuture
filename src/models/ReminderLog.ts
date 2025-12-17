import mongoose, { Schema, Document } from "mongoose";

export interface IReminderLog extends Document {
  templateId?: mongoose.Types.ObjectId;
  templateName?: string;
  chatId: string;
  userName?: string;
  message: string;
  status: "sent" | "failed";
  errorMessage?: string;
  triggerType: "automatic" | "manual";
  triggerDays?: number; // Days before due date
  sentAt: Date;
  sentBy?: mongoose.Types.ObjectId; // Admin ID if manually sent
}

const reminderLogSchema = new Schema<IReminderLog>(
  {
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "ReminderTemplate",
    },
    templateName: {
      type: String,
    },
    chatId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
      default: "sent",
    },
    errorMessage: {
      type: String,
    },
    triggerType: {
      type: String,
      enum: ["automatic", "manual"],
      required: true,
      default: "automatic",
    },
    triggerDays: {
      type: Number,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
reminderLogSchema.index({ chatId: 1, sentAt: -1 });
reminderLogSchema.index({ templateId: 1 });
reminderLogSchema.index({ status: 1 });
reminderLogSchema.index({ triggerType: 1 });

export const ReminderLog = mongoose.model<IReminderLog>(
  "ReminderLog",
  reminderLogSchema
);
