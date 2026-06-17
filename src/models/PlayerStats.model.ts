import mongoose, { Schema, Document } from "mongoose";

export interface IPlayerStats extends Document {
  userId: mongoose.Types.ObjectId;
  period: "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME";
  gameMode: "FREE_COIN" | "REAL_MONEY";

  // Aggregated statistics
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  netProfit: number;
  winRate: number;

  // Streaks
  currentStreak: number;
  bestStreak: number;
  lastGameResult?: "WIN" | "LOSS";

  // Rankings
  rank?: number;

  // Period tracking
  periodStart: Date;
  periodEnd: Date;

  // Timestamps
  lastUpdated: Date;
  createdAt: Date;
}

const PlayerStatsSchema = new Schema<IPlayerStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    period: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"],
      required: true,
    },
    gameMode: {
      type: String,
      enum: ["FREE_COIN", "REAL_MONEY"],
      required: true,
    },
    totalGames: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWins: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalLosses: {
      type: Number,
      default: 0,
      min: 0,
    },
    netProfit: {
      type: Number,
      default: 0,
    },
    winRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    bestStreak: {
      type: Number,
      default: 0,
    },
    lastGameResult: {
      type: String,
      enum: ["WIN", "LOSS"],
    },
    rank: {
      type: Number,
      min: 1,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
PlayerStatsSchema.index(
  { userId: 1, period: 1, gameMode: 1 },
  { unique: true }
);
PlayerStatsSchema.index({ period: 1, gameMode: 1, netProfit: -1 }); // For leaderboards
PlayerStatsSchema.index({ period: 1, gameMode: 1, winRate: -1 }); // For win rate leaderboards
PlayerStatsSchema.index({ periodEnd: 1 }); // For cleanup of old records

// Pre-save hook to calculate win rate
PlayerStatsSchema.pre("save", function (next) {
  if (this.totalGames > 0) {
    this.winRate = Math.round((this.totalWins / this.totalGames) * 10000) / 100;
  } else {
    this.winRate = 0;
  }
  this.lastUpdated = new Date();
  next();
});

const PlayerStats = mongoose.model<IPlayerStats>(
  "PlayerStats",
  PlayerStatsSchema
);

export default PlayerStats;
