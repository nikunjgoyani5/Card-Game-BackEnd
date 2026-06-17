import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  notificationId: string;
  userId: mongoose.Types.ObjectId;

  // Content
  type: string;
  title: string;
  message: string;
  data?: any;

  // Delivery
  channels: ("PUSH" | "IN_APP")[];
  priority: "HIGH" | "NORMAL" | "LOW";

  // Status
  read: boolean;
  readAt?: Date;

  // Grouping (for "friends online")
  groupId?: string;
  groupCount?: number;

  // Timestamps
  createdAt: Date;
  expiresAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Content
    type: {
      type: String,
      required: true,
      enum: [
        "FRIEND_REQUEST_RECEIVED",
        "FRIEND_REQUEST_ACCEPTED",
        "GAME_INVITATION",
        "GAME_REMINDER_15MIN",
        "GAME_REMINDER_5MIN",
        "FRIENDS_ONLINE",
        "DEPOSIT_COMPLETED",
        "WITHDRAWAL_COMPLETED",
        "KYC_APPROVED",
        "KYC_REJECTED",
        "NEW_FEATURE",
        "SYSTEM_ANNOUNCEMENT",
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },

    // Delivery
    channels: {
      type: [String],
      enum: ["PUSH", "IN_APP"],
      default: ["IN_APP", "PUSH"],
    },
    priority: {
      type: String,
      enum: ["HIGH", "NORMAL", "LOW"],
      default: "NORMAL",
    },

    // Status
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },

    // Grouping
    groupId: {
      type: String,
      index: true,
    },
    groupCount: {
      type: Number,
      default: 1,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
