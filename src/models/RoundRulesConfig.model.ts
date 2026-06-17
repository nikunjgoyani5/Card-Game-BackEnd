import mongoose, { Schema, Document } from "mongoose";

export interface IRoundRule {
  roundNumber: number;
  type: "WIN" | "LOSS" | "NO_CHANGE";
  amount: number;
  description: string;
}

export interface IRoundRulesConfig extends Document {
  gameLength: 26 | 52;
  rules: IRoundRule[];
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

const RoundRulesConfigSchema = new Schema<IRoundRulesConfig>(
  {
    gameLength: {
      type: Number,
      enum: [26, 52],
      required: true,
      index: true,
    },
    rules: {
      type: [RoundRuleSchema],
      required: true,
    },
    version: {
      type: String,
      required: true,
      default: "1.0",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Custom validation: rules array length must match gameLength
RoundRulesConfigSchema.pre("save", function (next) {
  if (this.rules.length !== this.gameLength) {
    next(
      new Error(
        `Rules array length (${this.rules.length}) must match gameLength (${this.gameLength})`
      )
    );
  } else {
    next();
  }
});

// Indexes for efficient queries
RoundRulesConfigSchema.index({ gameLength: 1, isActive: 1 });
RoundRulesConfigSchema.index({ version: 1 });
RoundRulesConfigSchema.index({ createdAt: -1 });

// Only one active config per game length
RoundRulesConfigSchema.index(
  { gameLength: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export default mongoose.model<IRoundRulesConfig>(
  "RoundRulesConfig",
  RoundRulesConfigSchema
);
