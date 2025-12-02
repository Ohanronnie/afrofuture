import mongoose from "mongoose";

export interface IBroadcast extends mongoose.Document {
  message: string;
  filter: "all" | "paid" | "pending";
  status: "sent" | "scheduled" | "failed";
  sentCount?: number;
  totalUsers?: number;
  scheduleTime?: Date;
  scheduledAt?: Date;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const broadcastSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  filter: {
    type: String,
    enum: ["all", "paid", "pending"],
    default: "all",
  },
  status: {
    type: String,
    enum: ["sent", "scheduled", "failed"],
    required: true,
  },
  sentCount: {
    type: Number,
  },
  totalUsers: {
    type: Number,
  },
  scheduleTime: {
    type: Date,
  },
  scheduledAt: {
    type: Date,
    default: Date.now,
  },
  executedAt: {
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

broadcastSchema.pre("save", function () {
  this.updatedAt = new Date();
});

export const Broadcast = mongoose.model<IBroadcast>(
  "Broadcast",
  broadcastSchema
);
