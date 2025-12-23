import mongoose from "mongoose";

export interface IExcelBroadcast extends mongoose.Document {
  message: string;
  phoneColumn: string;
  fileName: string;
  status: "processing" | "sent" | "failed" | "scheduled";
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  scheduleTime?: Date;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const excelBroadcastSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  phoneColumn: {
    type: String,
    required: true,
    default: "Mobile",
  },
  fileName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["processing", "sent", "failed", "scheduled"],
    required: true,
    default: "processing",
  },
  totalContacts: {
    type: Number,
    required: true,
    default: 0,
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  failedCount: {
    type: Number,
    default: 0,
  },
  skippedCount: {
    type: Number,
    default: 0,
  },
  scheduleTime: {
    type: Date,
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

excelBroadcastSchema.pre("save", function () {
  this.updatedAt = new Date();
});

export const ExcelBroadcast = mongoose.model<IExcelBroadcast>(
  "ExcelBroadcast",
  excelBroadcastSchema
);

