import mongoose, { Schema, Document } from "mongoose";

export interface IBotAction {
  type: "FLIP" | "AUTO_FLIP";
  flipNumber: number;
  timestamp: Date;
}

export interface IBotActivity extends Document {
  botId: string;
  roomId: Schema.Types.ObjectId;
  replacedPlayer: Schema.Types.ObjectId;
  actions: IBotAction[];
  finalScore: number;
  netChange: number;
  createdAt: Date;
  replacedAt: Date;
}

const BotActionSchema = new Schema<IBotAction>(
  {
    type: {
      type: String,
      enum: ["FLIP", "AUTO_FLIP"],
      required: true,
    },
    flipNumber: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now, required: true },
  },
  { _id: false }
);

const BotActivitySchema = new Schema<IBotActivity>(
  {
    botId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    replacedPlayer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actions: {
      type: [BotActionSchema],
      default: [],
    },
    finalScore: {
      type: Number,
      default: 0,
    },
    netChange: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    replacedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes
BotActivitySchema.index({ botId: 1 }, { unique: true });
BotActivitySchema.index({ roomId: 1 });
BotActivitySchema.index({ replacedPlayer: 1 });

const BotActivityModel = mongoose.model<IBotActivity>(
  "BotActivity",
  BotActivitySchema
);

export default BotActivityModel;
