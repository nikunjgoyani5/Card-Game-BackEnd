// src/models/AdminAuditLog.model.ts

import mongoose, { Schema, Document } from "mongoose";

/**
 * Admin Audit Log Model
 *
 * MANDATORY: All admin actions logged with timestamps and IP addresses
 *
 * Tracks:
 * - User account modifications (suspend, ban, KYC approval)
 * - Wallet adjustments (refunds, manual corrections)
 * - Game interventions (cancel game, force settlement)
 * - Fraud actions (freeze funds, investigate)
 * - Configuration changes (limits, fees, rules)
 * - Data access (viewing sensitive user data)
 */

export interface IAdminAuditLog extends Document {
  logId?: string;

  // Admin Details
  adminId: Schema.Types.ObjectId;
  adminUsername: string;
  adminRole: string;

  // Action Details
  action:
    | "USER_SUSPEND"
    | "USER_UNSUSPEND"
    | "USER_BAN"
    | "USER_UNBAN"
    | "KYC_APPROVE"
    | "KYC_REJECT"
    | "WALLET_ADJUST"
    | "GAME_CANCEL"
    | "GAME_FORCE_SETTLE"
    | "FRAUD_FLAG"
    | "FRAUD_RESOLVE"
    | "FUNDS_FREEZE"
    | "FUNDS_UNFREEZE"
    | "WITHDRAWAL_APPROVE"
    | "WITHDRAWAL_REJECT"
    | "REFUND_ISSUE"
    | "CONFIG_CHANGE"
    | "DATA_ACCESS"
    | "TRANSACTION_MODIFY"
    | "OTHER";

  category:
    | "USER_MANAGEMENT"
    | "KYC_VERIFICATION"
    | "WALLET_OPERATIONS"
    | "GAME_MANAGEMENT"
    | "FRAUD_PREVENTION"
    | "COMPLIANCE"
    | "SYSTEM_CONFIG"
    | "DATA_ACCESS";

  // Target Details
  targetUserId?: Schema.Types.ObjectId;
  targetUsername?: string;
  targetRoomId?: Schema.Types.ObjectId;
  targetTransactionId?: Schema.Types.ObjectId;
  targetKYCId?: Schema.Types.ObjectId;
  targetFraudAlertId?: Schema.Types.ObjectId;

  // Change Details
  description: string;
  oldValue?: mongoose.Schema.Types.Mixed; // JSON before change
  newValue?: mongoose.Schema.Types.Mixed; // JSON after change
  reason?: string; // Why action was taken

  // Context
  ipAddress: string; // MANDATORY
  userAgent?: string;
  deviceId?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Security
  sessionId?: string;
  twoFactorVerified?: boolean;

  // Result
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  errorMessage?: string;

  // Metadata
  metadata?: mongoose.Schema.Types.Mixed;
  tags?: string[]; // For categorization

  timestamp: Date;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    logId: { type: String, unique: true, sparse: true },

    // Admin Details
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminUsername: { type: String, required: true },
    adminRole: { type: String, required: true },

    // Action Details
    action: {
      type: String,
      enum: [
        "USER_SUSPEND",
        "USER_UNSUSPEND",
        "USER_BAN",
        "USER_UNBAN",
        "KYC_APPROVE",
        "KYC_REJECT",
        "WALLET_ADJUST",
        "GAME_CANCEL",
        "GAME_FORCE_SETTLE",
        "FRAUD_FLAG",
        "FRAUD_RESOLVE",
        "FUNDS_FREEZE",
        "FUNDS_UNFREEZE",
        "WITHDRAWAL_APPROVE",
        "WITHDRAWAL_REJECT",
        "REFUND_ISSUE",
        "CONFIG_CHANGE",
        "DATA_ACCESS",
        "TRANSACTION_MODIFY",
        "OTHER",
      ],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "USER_MANAGEMENT",
        "KYC_VERIFICATION",
        "WALLET_OPERATIONS",
        "GAME_MANAGEMENT",
        "FRAUD_PREVENTION",
        "COMPLIANCE",
        "SYSTEM_CONFIG",
        "DATA_ACCESS",
      ],
      required: true,
      index: true,
    },

    // Target Details
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    targetUsername: { type: String },
    targetRoomId: { type: Schema.Types.ObjectId, ref: "Room" },
    targetTransactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
    targetKYCId: { type: Schema.Types.ObjectId, ref: "KYCVerification" },
    targetFraudAlertId: { type: Schema.Types.ObjectId, ref: "FraudAlert" },

    // Change Details
    description: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    reason: { type: String },

    // Context
    ipAddress: { type: String, required: true, index: true }, // MANDATORY
    userAgent: { type: String },
    deviceId: { type: String },
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },

    // Security
    sessionId: { type: String },
    twoFactorVerified: { type: Boolean, default: false },

    // Result
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "PARTIAL"],
      required: true,
      default: "SUCCESS",
      index: true,
    },
    errorMessage: { type: String },

    // Metadata
    metadata: { type: Schema.Types.Mixed },
    tags: [{ type: String }],

    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for audit queries
AdminAuditLogSchema.index({ logId: 1 }, { unique: true, sparse: true });
AdminAuditLogSchema.index({ adminId: 1, timestamp: -1 });
AdminAuditLogSchema.index({ action: 1, timestamp: -1 });
AdminAuditLogSchema.index({ category: 1, timestamp: -1 });
AdminAuditLogSchema.index({ targetUserId: 1, timestamp: -1 });
AdminAuditLogSchema.index({ ipAddress: 1, timestamp: -1 });
AdminAuditLogSchema.index({ timestamp: -1 });

// Compound index for filtered queries
AdminAuditLogSchema.index({ category: 1, action: 1, timestamp: -1 });

// Pre-save: Auto-generate logId
AdminAuditLogSchema.pre("save", function (next) {
  if (!this.logId) {
    this.logId = this._id.toString();
  }
  next();
});

export default mongoose.model<IAdminAuditLog>(
  "AdminAuditLog",
  AdminAuditLogSchema
);
