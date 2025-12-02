import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
  },
  email: {
    type: String,
  },
  session: {
    type: mongoose.Schema.Types.Mixed,
    default: { state: "WELCOME" },
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

userSchema.pre("save", function () {
  this.updatedAt = new Date();
});

export const User = mongoose.model("User", userSchema);
