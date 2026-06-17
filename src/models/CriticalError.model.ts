import mongoose, { Schema, Document } from "mongoose";

export interface ICriticalError extends Document {
  errorId?: string;
  errorType: "CARD_NOT_FOUND" | "DATA_CORRUPTION" | "SETTLEMENT_ERROR";
  severity: "CRITICAL" | "HIGH";
  roomId?: Schema.Types.ObjectId;
  userId?: Schema.Types.ObjectId;
  flipNumber?: number;
  revealedCard?: string;
  playerHands?: string;
  errorMessage: string;
  stackTrace?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  timestamp: Date;
}

const CriticalErrorSchema = new Schema<ICriticalError>(
  {
    errorId: { type: String, unique: true, sparse: true },
    errorType: {
      type: String,
      enum: ["CARD_NOT_FOUND", "DATA_CORRUPTION", "SETTLEMENT_ERROR"],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["CRITICAL", "HIGH"],
      required: true,
      default: "CRITICAL",
    },
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    flipNumber: { type: Number },
    revealedCard: { type: String },
    playerHands: { type: String },
    errorMessage: { type: String, required: true },
    stackTrace: { type: String },
    resolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
    resolution: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
CriticalErrorSchema.index({ errorId: 1 }, { unique: true, sparse: true });
CriticalErrorSchema.index({ errorType: 1, timestamp: -1 });
CriticalErrorSchema.index({ roomId: 1 }, { sparse: true });
CriticalErrorSchema.index({ resolved: 1 });
CriticalErrorSchema.index({ timestamp: -1 });

// Pre-save hook to auto-generate errorId if not provided
CriticalErrorSchema.pre("save", function (next) {
  if (!this.errorId) {
    this.errorId = this._id.toString();
  }
  next();
});

export default mongoose.model<ICriticalError>(
  "CriticalError",
  CriticalErrorSchema
);
