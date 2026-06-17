import mongoose, { Schema, Types, Document } from "mongoose";
import { DECKS, ROOM_STATUS, WALLET_TYPE } from "../utils/constants.utility";

// Define the IPlayer interface
export interface IPlayer {
  userId: Types.ObjectId; // Reference to the User model
  socketId: string;
  seat: number;
  ready: boolean;
}

// Define the IRoom interface
export interface IRoom extends Document {
  roomId?: string; // Unique room ID (optional, defaults to _id.toString())
  code: string; // Room code (6-char alphanumeric)
  roomType: string; // PUBLIC or PRIVATE
  isPrivate: boolean; // Legacy field (kept for compatibility)
  isScheduled: boolean;
  ownerId: Types.ObjectId; // Reference to the User model (hostId)

  // Game Configuration
  gameMode: string; // FREE_COIN or REAL_MONEY (same as walletType)
  gameLength: number; // 26 or 52 rounds
  deck: DECKS; // Enum value from DECKS
  maxPlayers: number; // 2, 4, or 13

  // Betting
  baseBetAmount: number; // Minimum $25
  betMultiplier: number; // 1x, 2x, 3x, 5x, 10x, etc.
  maxWinningAmount: number; // baseBetAmount * betMultiplier
  entryFee: number; // (gameLength * betMultiplier) / maxPlayers

  // Players
  players: IPlayer[]; // Array of players
  currentPlayers: number;

  // Legacy fields (kept for compatibility)
  walletType: WALLET_TYPE; // Enum value from WALLET_TYPE
  stake: number;

  // State
  status: ROOM_STATUS; // Enum value from ROOM_STATUS

  // Scheduling
  scheduledStartTime?: Date; // Optional scheduled start
  startDate?: Date; // Legacy field (kept for compatibility)
  endDate?: Date; // Optional end date

  // Game State (populated when IN_PROGRESS)
  dealerDeck?: string[]; // Ordered card deck (single source of truth)
  playerHands?: Map<string, string[]>; // userId → cards

  // Timestamps
  createdAt?: Date; // Automatically added by Mongoose
  updatedAt?: Date; // Automatically added by Mongoose
  startedAt?: Date;
}

// Define the PlayerSub schema
const PlayerSub = new mongoose.Schema<IPlayer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    socketId: String,
    seat: Number,
    ready: { type: Boolean, default: false },
  },
  { _id: false }
);

// Define the Room schema
const RoomSchema = new mongoose.Schema<IRoom>(
  {
    roomId: { type: String, unique: true, sparse: true }, // Optional, defaults to _id.toString()
    code: { type: String, index: true, unique: true },
    roomType: { type: String, enum: ["PUBLIC", "PRIVATE"], default: "PUBLIC" },
    isPrivate: { type: Boolean, default: false }, // Legacy field
    isScheduled: { type: Boolean, default: false },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },

    // Game Configuration
    gameMode: {
      type: String,
      enum: [WALLET_TYPE.FREE_COIN, WALLET_TYPE.REAL_MONEY],
      default: WALLET_TYPE.FREE_COIN,
    },
    gameLength: { type: Number, enum: [26, 52], default: 52 },
    deck: {
      type: Number,
      enum: [DECKS.FULL, DECKS.HALF, DECKS.QUARTER],
      default: DECKS.FULL,
    },
    maxPlayers: { type: Number, enum: [2, 4, 13], default: 4 },

    // Betting
    baseBetAmount: { type: Number, default: 25, min: 25 },
    betMultiplier: { type: Number, default: 1, min: 1 },
    maxWinningAmount: { type: Number, default: 25 },
    entryFee: { type: Number, default: 0 },

    // Players
    players: { type: [PlayerSub], default: [] },
    currentPlayers: { type: Number, default: 0 },

    // Legacy fields
    walletType: {
      type: String,
      enum: [WALLET_TYPE.FREE_COIN, WALLET_TYPE.REAL_MONEY],
      default: WALLET_TYPE.FREE_COIN,
    },
    stake: { type: Number, default: 25 },

    // State
    status: {
      type: String,
      enum: [
        ROOM_STATUS.ENDED,
        ROOM_STATUS.IN_PROGRESS,
        ROOM_STATUS.WAITING,
        ROOM_STATUS.CANCELLED,
      ],
      default: ROOM_STATUS.WAITING,
    },

    // Scheduling
    scheduledStartTime: { type: Date },
    startDate: { type: Date, default: Date.now }, // Legacy field
    endDate: { type: Date },
    startedAt: { type: Date },

    // Game State
    dealerDeck: { type: [String], default: undefined },
    playerHands: { type: Map, of: [String], default: undefined },
  },
  {
    timestamps: true,
  }
);

// Indexes as per section 7.2
RoomSchema.index({ roomId: 1 }, { unique: true, sparse: true });
RoomSchema.index({ code: 1 }, { unique: true });
RoomSchema.index({ status: 1, gameMode: 1, roomType: 1 });
RoomSchema.index({ gameLength: 1, betMultiplier: 1, status: 1 });
RoomSchema.index({ scheduledStartTime: 1 }, { sparse: true });
RoomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // 24hr TTL

// Pre-save hook to auto-generate roomId if not provided
RoomSchema.pre("save", function (next) {
  if (!this.roomId) {
    this.roomId = this._id.toString();
  }
  next();
});

// Export the Room model
export default mongoose.model<IRoom>("Room", RoomSchema);
