import mongoose, { Schema } from "mongoose";
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  WALLET_TYPE,
} from "../utils/constants.utility";

const TransactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true, sparse: true }, // Optional, defaults to _id.toString()
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },

    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPE),
    },
    amount: Number,
    walletType: { type: String, enum: Object.values(WALLET_TYPE) }, // gameMode in doc

    status: {
      type: String,
      enum: [...Object.values(TRANSACTION_STATUS), "REFUNDED"],
      default: TRANSACTION_STATUS.PENDING,
    },

    // Balance tracking
    before: Number, // Legacy field (balanceBefore)
    after: Number, // Legacy field (balanceAfter)
    balanceBefore: Number, // As per schema doc
    balanceAfter: Number, // As per schema doc

    // Additional metadata
    metadata: { type: Schema.Types.Mixed },
    packageId: String,
    adId: String,
    adRevenue: Number,

    // Tracking
    ipAddress: String,
    deviceId: String,
  },
  {
    timestamps: true,
  }
);

// Indexes as per section 7.3
TransactionSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ roomId: 1 }, { sparse: true });
TransactionSchema.index({ type: 1, status: 1 });
TransactionSchema.index({ createdAt: -1 });

// Pre-save hook to auto-generate transactionId if not provided
TransactionSchema.pre("save", function (next) {
  if (!this.transactionId) {
    this.transactionId = this._id.toString();
  }
  next();
});

export default mongoose.model("Transaction", TransactionSchema);
