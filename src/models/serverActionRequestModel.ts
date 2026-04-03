import mongoose from "mongoose";

const serverActionRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ["start", "stop", "restart", "format", "changepassword", "reinstall"],
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: { type: Date },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    adminNotes: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed },
    orderSnapshot: {
      productName: String,
      ipAddress: String,
      customerEmail: String,
      customerName: String,
      os: String,
      memory: String,
    },
  },
  { timestamps: true }
);

serverActionRequestSchema.index({ orderId: 1, status: 1 });
serverActionRequestSchema.index({ status: 1, requestedAt: -1 });
serverActionRequestSchema.index({ userId: 1, status: 1 });
serverActionRequestSchema.index(
  { orderId: 1, action: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export default mongoose.models.ServerActionRequest ||
  mongoose.model("ServerActionRequest", serverActionRequestSchema);
