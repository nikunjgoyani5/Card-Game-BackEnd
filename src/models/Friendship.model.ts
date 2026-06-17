import mongoose, { Schema, Document } from "mongoose";

export interface IFriendship extends Document {
  friendshipId: string;
  userId: mongoose.Types.ObjectId; // User A
  friendId: mongoose.Types.ObjectId; // User B
  status: "PENDING" | "ACCEPTED" | "BLOCKED";
  requesterId: mongoose.Types.ObjectId; // Who initiated
  requestedAt: Date;
  acceptedAt?: Date;
  lastInteraction?: Date; // Last time played together
  gamesPlayedTogether: number;
  createdAt: Date;
  updatedAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    friendshipId: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        `friendship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    friendId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "BLOCKED"],
      default: "PENDING",
      index: true,
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    acceptedAt: {
      type: Date,
    },
    lastInteraction: {
      type: Date,
    },
    gamesPlayedTogether: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
FriendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true });
FriendshipSchema.index({ userId: 1, status: 1 });
FriendshipSchema.index({ friendId: 1, status: 1 });
FriendshipSchema.index({ requesterId: 1, status: 1 });

// Pre-save hook to ensure data integrity
FriendshipSchema.pre("save", function (next) {
  // Prevent self-friending
  if (this.userId.equals(this.friendId)) {
    return next(new Error("Cannot add yourself as a friend"));
  }
  next();
});

const Friendship = mongoose.model<IFriendship>("Friendship", FriendshipSchema);

export default Friendship;
