import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentTransaction extends Document {
  transactionId: string;
  userId: mongoose.Types.ObjectId;
  type: "DEPOSIT" | "REFUND";
  amount: number;
  fee: number;
  totalAmount: number;
  netAmount: number;
  paymentMethod: "CREDIT_CARD" | "PAYPAL" | "GOOGLE_PAY";
  status:
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "REFUNDED"
    | "CANCELLED";

  // Payment provider details
  paymentProvider: "STRIPE" | "PAYPAL" | "GOOGLE_PAY";
  providerSessionId?: string;
  providerTransactionId?: string;
  providerPaymentIntentId?: string;

  // URLs for redirect
  returnUrl?: string;
  cancelUrl?: string;

  // Webhook tracking
  webhookReceived?: boolean;
  webhookReceivedAt?: Date;

  // Failure details
  failureReason?: string;
  failureCode?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  expiresAt?: Date;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () =>
        `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["DEPOSIT", "REFUND"],
      required: true,
      default: "DEPOSIT",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    fee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["CREDIT_CARD", "PAYPAL", "GOOGLE_PAY"],
      required: true,
      index: true,
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
      required: true,
    },
    providerSessionId: {
      type: String,
      index: true,
    },
    providerTransactionId: {
      type: String,
      index: true,
    },
    providerPaymentIntentId: {
      type: String,
    },
    returnUrl: String,
    cancelUrl: String,
    webhookReceived: {
      type: Boolean,
      default: false,
    },
    webhookReceivedAt: Date,
    failureReason: String,
    failureCode: String,
    completedAt: Date,
    failedAt: Date,
    expiresAt: {
      type: Date,
      index: true,
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
PaymentTransactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
PaymentTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });
PaymentTransactionSchema.index({ status: 1, createdAt: -1 });
PaymentTransactionSchema.index({ expiresAt: 1 }, { sparse: true });

// Pre-save hook to calculate derived fields
PaymentTransactionSchema.pre("save", function (next) {
  // Calculate net amount (amount user receives after fees)
  if (this.type === "DEPOSIT") {
    this.netAmount = this.amount; // User gets the amount, pays fee separately
  } else if (this.type === "REFUND") {
    this.netAmount = this.amount; // User gets refunded amount
  }

  // Set expiry time (30 minutes for payment sessions)
  if (!this.expiresAt && this.status === "PENDING") {
    this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  }

  next();
});

const PaymentTransaction = mongoose.model<IPaymentTransaction>(
  "PaymentTransaction",
  PaymentTransactionSchema
);

export default PaymentTransaction;
