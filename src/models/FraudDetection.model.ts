// src/models/FraudDetection.model.ts

import mongoose, { Schema, Document } from "mongoose";

/**
 * Fraud Detection Model
 *
 * CRITICAL: Advanced fraud detection and prevention
 *
 * Detection Patterns:
 * - Multiple accounts from same device/IP
 * - Suspicious betting patterns
 * - Rapid win/loss streaks
 * - Collusion detection (players working together)
 * - Bot-like behavior
 * - Unusual withdrawal patterns
 */

export interface IFraudAlert extends Document {
  alertId?: string;
  userId?: Schema.Types.ObjectId;
  roomId?: Schema.Types.ObjectId;

  // Alert Classification
  type:
    | "MULTI_ACCOUNTING"
    | "COLLUSION"
    | "BOT_BEHAVIOR"
    | "UNUSUAL_PATTERN"
    | "RAPID_WITHDRAWAL"
    | "SUSPICIOUS_TRANSACTION"
    | "CHARGEBACK_FRAUD"
    | "IDENTITY_FRAUD";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status:
    | "PENDING"
    | "INVESTIGATING"
    | "CONFIRMED"
    | "FALSE_POSITIVE"
    | "RESOLVED";

  // Detection Details
  detectionMethod: "AUTOMATED" | "MANUAL" | "USER_REPORT";
  description: string;
  evidence: mongoose.Schema.Types.Mixed; // JSON with evidence

  // Risk Scoring
  riskScore: number; // 0-100
  confidence: number; // 0-100 (ML model confidence)

  // Related Entities
  relatedUsers?: Schema.Types.ObjectId[];
  relatedRooms?: Schema.Types.ObjectId[];
  relatedTransactions?: Schema.Types.ObjectId[];
  relatedIPAddresses?: string[];
  relatedDeviceIds?: string[];

  // Actions Taken
  actionTaken?:
    | "NONE"
    | "FLAGGED"
    | "ACCOUNT_SUSPENDED"
    | "ACCOUNT_BANNED"
    | "FUNDS_FROZEN"
    | "WITHDRAWAL_BLOCKED";
  actionTakenAt?: Date;
  actionTakenBy?: Schema.Types.ObjectId; // Admin

  // Investigation
  investigatedBy?: Schema.Types.ObjectId;
  investigatedAt?: Date;
  investigationNotes?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;

  // Audit
  detectedAt: Date;
  ipAddress?: string;
  deviceId?: string;

  createdAt: Date;
  updatedAt: Date;
}

const FraudAlertSchema = new Schema<IFraudAlert>(
  {
    alertId: { type: String, unique: true, sparse: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },

    // Alert Classification
    type: {
      type: String,
      enum: [
        "MULTI_ACCOUNTING",
        "COLLUSION",
        "BOT_BEHAVIOR",
        "UNUSUAL_PATTERN",
        "RAPID_WITHDRAWAL",
        "SUSPICIOUS_TRANSACTION",
        "CHARGEBACK_FRAUD",
        "IDENTITY_FRAUD",
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "INVESTIGATING",
        "CONFIRMED",
        "FALSE_POSITIVE",
        "RESOLVED",
      ],
      default: "PENDING",
      required: true,
      index: true,
    },

    // Detection Details
    detectionMethod: {
      type: String,
      enum: ["AUTOMATED", "MANUAL", "USER_REPORT"],
      required: true,
    },
    description: { type: String, required: true },
    evidence: { type: Schema.Types.Mixed },

    // Risk Scoring
    riskScore: { type: Number, min: 0, max: 100, required: true, index: true },
    confidence: { type: Number, min: 0, max: 100, required: true },

    // Related Entities
    relatedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    relatedRooms: [{ type: Schema.Types.ObjectId, ref: "Room" }],
    relatedTransactions: [{ type: Schema.Types.ObjectId, ref: "Transaction" }],
    relatedIPAddresses: [{ type: String }],
    relatedDeviceIds: [{ type: String }],

    // Actions Taken
    actionTaken: {
      type: String,
      enum: [
        "NONE",
        "FLAGGED",
        "ACCOUNT_SUSPENDED",
        "ACCOUNT_BANNED",
        "FUNDS_FROZEN",
        "WITHDRAWAL_BLOCKED",
      ],
      default: "NONE",
    },
    actionTakenAt: { type: Date },
    actionTakenBy: { type: Schema.Types.ObjectId, ref: "User" },

    // Investigation
    investigatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    investigatedAt: { type: Date },
    investigationNotes: { type: String },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String },

    // Audit
    detectedAt: { type: Date, default: Date.now, required: true, index: true },
    ipAddress: { type: String },
    deviceId: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
FraudAlertSchema.index({ alertId: 1 }, { unique: true, sparse: true });
FraudAlertSchema.index({ userId: 1, detectedAt: -1 });
FraudAlertSchema.index({ type: 1, severity: 1, status: 1 });
FraudAlertSchema.index({ riskScore: -1 });
FraudAlertSchema.index({ detectedAt: -1 });

// Pre-save: Auto-generate alertId
FraudAlertSchema.pre("save", function (next) {
  if (!this.alertId) {
    this.alertId = this._id.toString();
  }
  next();
});

export default mongoose.model<IFraudAlert>("FraudAlert", FraudAlertSchema);
