import mongoose, { Schema, Document } from "mongoose";

export interface IRoundRule {
  roundNumber: number;
  type: "WIN" | "LOSS" | "NO_CHANGE";
  amount: number;
  description: string;
}

export interface IFlipHistory extends Document {
  flipId?: string;
  roomId: Schema.Types.ObjectId;
  flipNumber: number;
  revealedCard: string;
  matchedPlayer: Schema.Types.ObjectId;
  ruleApplied: IRoundRule;
  scoreChange: number;
  triggeredBy: "PLAYER" | "AUTO" | "REQUEST";
  playerId?: Schema.Types.ObjectId;
  timestamp: Date;
}

const RoundRuleSchema = new Schema<IRoundRule>(
  {
    roundNumber: { type: Number, required: true },
    type: { type: String, enum: ["WIN", "LOSS", "NO_CHANGE"], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

const FlipHistorySchema = new Schema<IFlipHistory>(
  {
    flipId: { type: String, unique: true, sparse: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    flipNumber: { type: Number, required: true },
    revealedCard: { type: String, required: true },
    matchedPlayer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ruleApplied: { type: RoundRuleSchema, required: true },
    scoreChange: { type: Number, required: true },
    triggeredBy: {
      type: String,
      enum: ["PLAYER", "AUTO", "REQUEST"],
      required: true,
    },
    playerId: { type: Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
FlipHistorySchema.index({ flipId: 1 }, { unique: true, sparse: true });
FlipHistorySchema.index({ roomId: 1, flipNumber: 1 });
FlipHistorySchema.index({ matchedPlayer: 1 }, { sparse: true });
FlipHistorySchema.index({ timestamp: -1 });

// Pre-save hook to auto-generate flipId if not provided
FlipHistorySchema.pre("save", function (next) {
  if (!this.flipId) {
    this.flipId = this._id.toString();
  }
  next();
});

export default mongoose.model<IFlipHistory>("FlipHistory", FlipHistorySchema);
