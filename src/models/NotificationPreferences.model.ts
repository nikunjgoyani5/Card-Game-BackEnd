import mongoose, { Schema, Document } from "mongoose";

export interface INotificationPreferences extends Document {
  userId: mongoose.Types.ObjectId;

  enabled: {
    friendRequests: boolean;
    gameInvitations: boolean;
    scheduledGameReminders: boolean;
    friendsOnline: boolean;
    transactions: boolean;
    newFeatures: boolean;
    systemAnnouncements: boolean;
  };

  quietHours: {
    enabled: boolean;
    startTime: string; // "22:00"
    endTime: string; // "08:00"
    timezone: string; // "America/New_York"
  };

  pushEnabled: boolean;
  inAppEnabled: boolean;

  updatedAt: Date;
}

const NotificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    enabled: {
      friendRequests: {
        type: Boolean,
        default: true,
      },
      gameInvitations: {
        type: Boolean,
        default: true,
      },
      scheduledGameReminders: {
        type: Boolean,
        default: true,
      },
      friendsOnline: {
        type: Boolean,
        default: true,
      },
      transactions: {
        type: Boolean,
        default: true,
      },
      newFeatures: {
        type: Boolean,
        default: true,
      },
      systemAnnouncements: {
        type: Boolean,
        default: true,
      },
    },

    quietHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      startTime: {
        type: String,
        default: "22:00",
      },
      endTime: {
        type: String,
        default: "08:00",
      },
      timezone: {
        type: String,
        default: "UTC",
      },
    },

    pushEnabled: {
      type: Boolean,
      default: true,
    },
    inAppEnabled: {
      type: Boolean,
      default: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Update timestamp on save
NotificationPreferencesSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<INotificationPreferences>(
  "NotificationPreferences",
  NotificationPreferencesSchema
);
