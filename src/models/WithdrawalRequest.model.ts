import mongoose, { Schema, Document } from "mongoose";

export interface IWithdrawalDestination {
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
    bankName?: string;
  };
  paypal?: {
    email: string;
  };
  googleWallet?: {
    email: string;
  };
}

export interface IWithdrawalRequest extends Document {
  withdrawalId: string;
  userId: mongoose.Types.ObjectId;
  amount: number;
  fee: number;
  netAmount: number;
  method: "BANK_ACCOUNT" | "PAYPAL" | "GOOGLE_WALLET";
  destination: IWithdrawalDestination;
  status:
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "REFUNDED"
    | "CANCELLED";

  // Payment provider details
  paymentProvider?: "STRIPE" | "PAYPAL" | "GOOGLE_PAY";
  providerTransactionId?: string;
  providerPayoutId?: string;

  // KYC validation
  kycVerified: boolean;
  kycId?: string;

  // Failure details
  failureReason?: string;
  failureCode?: string;

  // Timestamps
  requestedAt: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  estimatedArrival?: string;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    withdrawalId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () =>
        `wd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 50, // Minimum $50
    },
    fee: {
      type: Number,
      required: true,
      default: 2.0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      enum: ["BANK_ACCOUNT", "PAYPAL", "GOOGLE_WALLET"],
      required: true,
      index: true,
    },
    destination: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "REFUNDED",
        "CANCELLED",
      ],
      default: "PENDING",
      index: true,
    },
    paymentProvider: {
      type: String,
      enum: ["STRIPE", "PAYPAL", "GOOGLE_PAY"],
    },
    providerTransactionId: {
      type: String,
      index: true,
    },
    providerPayoutId: {
      type: String,
    },
    kycVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    kycId: {
      type: String,
    },
    failureReason: String,
    failureCode: String,
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processingStartedAt: Date,
    completedAt: Date,
    failedAt: Date,
    estimatedArrival: {
      type: String,
      default: "Instant",
    },
    ipAddress: String,
    userAgent: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
WithdrawalRequestSchema.index({ userId: 1, status: 1, requestedAt: -1 });
WithdrawalRequestSchema.index({ userId: 1, requestedAt: -1 });
WithdrawalRequestSchema.index({ status: 1, requestedAt: -1 });

// Pre-save hook to calculate net amount
WithdrawalRequestSchema.pre("save", function (next) {
  // Net amount is what user receives after deducting fee
  this.netAmount = this.amount - this.fee;
  next();
});

const WithdrawalRequest = mongoose.model<IWithdrawalRequest>(
  "WithdrawalRequest",
  WithdrawalRequestSchema
);

export default WithdrawalRequest;
