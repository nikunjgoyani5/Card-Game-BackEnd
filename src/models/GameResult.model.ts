import mongoose, { Schema, Document } from "mongoose";

export interface IPlayerStanding {
  userId: Schema.Types.ObjectId;
  username: string;
  rank: number;
  entryFee: number;
  score: number;
  finalPot: number;
  platformFee: number;
  playerReceives: number;
  netChange: number;
}

export interface IGameResult extends Document {
  resultId?: string;
  roomId: Schema.Types.ObjectId;
  gameMode: string;
  gameLength: number;
  maxPlayers: number;
  entryFee: number;
  maxWinningAmount: number;
  baseBetAmount: number;
  betMultiplier: number;
  totalPlatformFees: number;
  standings: IPlayerStanding[];
  status: "COMPLETED" | "CANCELLED";
  startedAt: Date;
  endedAt: Date;
  duration: number;
  createdAt: Date;
}

const PlayerStandingSchema = new Schema<IPlayerStanding>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    rank: { type: Number, required: true },
    entryFee: { type: Number, required: true },
    score: { type: Number, required: true },
    finalPot: { type: Number, required: true },
    platformFee: { type: Number, required: true, default: 0 },
    playerReceives: { type: Number, required: true },
    netChange: { type: Number, required: true },
  },
  { _id: false }
);

const GameResultSchema = new Schema<IGameResult>(
  {
    resultId: { type: String, unique: true, sparse: true },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      unique: true,
      index: true,
    },
    gameMode: {
      type: String,
      enum: ["FREE_COIN", "REAL_MONEY"],
      required: true,
      index: true,
    },
    gameLength: { type: Number, enum: [26, 52], required: true },
    maxPlayers: { type: Number, required: true },
    entryFee: { type: Number, required: true },
    maxWinningAmount: { type: Number, required: true },
    baseBetAmount: { type: Number, required: true },
    betMultiplier: { type: Number, required: true },
    totalPlatformFees: { type: Number, required: true, default: 0 },
    standings: {
      type: [PlayerStandingSchema],
      required: true,
      validate: {
        validator: function (standings: IPlayerStanding[]) {
          return standings.length > 0;
        },
        message: "Standings array cannot be empty",
      },
    },
    status: {
      type: String,
      enum: ["COMPLETED", "CANCELLED"],
      default: "COMPLETED",
      required: true,
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true, index: true },
    duration: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
GameResultSchema.index({ resultId: 1 }, { unique: true, sparse: true });
GameResultSchema.index({ roomId: 1 }, { unique: true });
GameResultSchema.index({ endedAt: -1 });
GameResultSchema.index({ "standings.userId": 1 });
GameResultSchema.index({ gameMode: 1, endedAt: -1 });

// Virtual for winner
GameResultSchema.virtual("winner").get(function () {
  return this.standings[0]; // First place (highest rank)
});

// Pre-save hook to auto-generate resultId if not provided
GameResultSchema.pre("save", function (next) {
  if (!this.resultId) {
    this.resultId = this._id.toString();
  }
  next();
});

// Post-save hook to update player stats
GameResultSchema.post("save", async function (doc) {
  // Only update stats for completed games
  if (doc.status === "COMPLETED") {
    try {
      const statsService =
        require("../modules/leaderboard/stats.service").default;
      await statsService.updatePlayerStatsAfterGame(doc._id.toString());
    } catch (error) {
      console.error("Error updating player stats after game:", error);
    }
  }
});

export default mongoose.model<IGameResult>("GameResult", GameResultSchema);
