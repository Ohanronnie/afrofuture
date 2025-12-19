import mongoose from "mongoose";

const soldTicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  chatId: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
  },
  ticketType: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  imageUrl: {
    type: String,
  },
  location: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const SoldTicket = mongoose.model("SoldTicket", soldTicketSchema);
