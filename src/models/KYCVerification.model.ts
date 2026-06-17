// src/models/KYCVerification.model.ts

import mongoose, { Schema, Document } from "mongoose";

/**
 * KYC (Know Your Customer) Verification Model
 *
 * LEGAL REQUIREMENT: Identity verification before withdrawals
 * Compliance: AML (Anti-Money Laundering), KYC regulations
 *
 * Verification Levels:
 * - NONE: No verification (can play, cannot withdraw)
 * - BASIC: Email + Phone verified (small withdrawals up to $100)
 * - STANDARD: ID document verified (withdrawals up to $1,000)
 * - ENHANCED: Full verification with proof of address (unlimited)
 */

export interface IKYCDocument {
  type: "ID_CARD" | "PASSPORT" | "DRIVERS_LICENSE" | "PROOF_OF_ADDRESS";
  fileUrl: string; // S3/Cloud storage URL (encrypted)
  uploadedAt: Date;
  verifiedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  verifiedBy?: Schema.Types.ObjectId; // Admin who verified
}

export interface IKYCVerification extends Document {
  userId: Schema.Types.ObjectId;

  // Verification Status
  level: "NONE" | "BASIC" | "STANDARD" | "ENHANCED";
  status: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED";

  // Personal Information (verified)
  verifiedFirstName?: string;
  verifiedLastName?: string;
  verifiedDateOfBirth?: Date;
  verifiedAddress?: {
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };

  // Documents
  documents: IKYCDocument[];

  // Verification Details
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  phoneVerified: boolean;
  phoneVerifiedAt?: Date;

  // Withdrawal Limits (USD)
  dailyWithdrawalLimit: number;
  monthlyWithdrawalLimit: number;
  lifetimeWithdrawalLimit: number;

  // Tracking
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: Schema.Types.ObjectId; // Admin who reviewed
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  expiresAt?: Date; // KYC expires after 1 year

  // Audit
  ipAddress?: string;
  deviceId?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const KYCDocumentSchema = new Schema<IKYCDocument>(
  {
    type: {
      type: String,
      enum: ["ID_CARD", "PASSPORT", "DRIVERS_LICENSE", "PROOF_OF_ADDRESS"],
      required: true,
    },
    fileUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now, required: true },
    verifiedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const KYCVerificationSchema = new Schema<IKYCVerification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Verification Status
    level: {
      type: String,
      enum: ["NONE", "BASIC", "STANDARD", "ENHANCED"],
      default: "NONE",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "EXPIRED"],
      default: "PENDING",
      required: true,
      index: true,
    },

    // Personal Information
    verifiedFirstName: { type: String },
    verifiedLastName: { type: String },
    verifiedDateOfBirth: { type: Date },
    verifiedAddress: {
      street: String,
      city: String,
      state: String,
      zipcode: String,
      country: String,
    },

    // Documents
    documents: {
      type: [KYCDocumentSchema],
      default: [],
    },

    // Verification Details
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    phoneVerified: { type: Boolean, default: false },
    phoneVerifiedAt: { type: Date },

    // Withdrawal Limits
    dailyWithdrawalLimit: { type: Number, default: 0 },
    monthlyWithdrawalLimit: { type: Number, default: 0 },
    lifetimeWithdrawalLimit: { type: Number, default: 0 },

    // Tracking
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    expiresAt: { type: Date },

    // Audit
    ipAddress: { type: String },
    deviceId: { type: String },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for queries
KYCVerificationSchema.index({ userId: 1 }, { unique: true });
KYCVerificationSchema.index({ status: 1, level: 1 });
KYCVerificationSchema.index({ expiresAt: 1 });
KYCVerificationSchema.index({ submittedAt: -1 });

// Pre-save: Set withdrawal limits based on verification level
KYCVerificationSchema.pre("save", function (next) {
  if (this.isModified("level") || this.isModified("status")) {
    if (this.status === "APPROVED") {
      switch (this.level) {
        case "BASIC":
          this.dailyWithdrawalLimit = 100;
          this.monthlyWithdrawalLimit = 500;
          this.lifetimeWithdrawalLimit = 1000;
          break;
        case "STANDARD":
          this.dailyWithdrawalLimit = 1000;
          this.monthlyWithdrawalLimit = 5000;
          this.lifetimeWithdrawalLimit = 10000;
          break;
        case "ENHANCED":
          this.dailyWithdrawalLimit = 10000;
          this.monthlyWithdrawalLimit = 50000;
          this.lifetimeWithdrawalLimit = Infinity;
          break;
        default:
          this.dailyWithdrawalLimit = 0;
          this.monthlyWithdrawalLimit = 0;
          this.lifetimeWithdrawalLimit = 0;
      }

      // Set expiry (1 year for ENHANCED, no expiry for others)
      if (this.level === "ENHANCED" && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      }
    } else {
      // Not approved - no withdrawal limits
      this.dailyWithdrawalLimit = 0;
      this.monthlyWithdrawalLimit = 0;
      this.lifetimeWithdrawalLimit = 0;
    }
  }

  next();
});

export default mongoose.model<IKYCVerification>(
  "KYCVerification",
  KYCVerificationSchema
);
