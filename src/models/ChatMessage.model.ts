import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  messageId: string;
  roomId?: mongoose.Types.ObjectId; // Optional - for room chat

  // Direct message fields
  recipientId?: mongoose.Types.ObjectId; // For direct messages
  conversationId?: string; // Unique ID for conversation between two users

  // Sender info
  senderId: mongoose.Types.ObjectId;
  senderUsername: string;

  // Message content
  messageType: "TEXT" | "QUICK_MESSAGE";
  content: string;
  quickMessageId?: string; // If predefined message

  // Message context
  chatType: "ROOM" | "DIRECT"; // Type of chat

  // Moderation
  filtered: boolean; // If profanity filtered
  originalContent?: string; // Original if filtered

  // Read status (for direct messages)
  read?: boolean;
  readAt?: Date;

  // Timestamps
  timestamp: Date;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    messageId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: false, // Optional for direct messages
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, // For direct messages
      index: true,
    },
    conversationId: {
      type: String,
      required: false, // For direct messages
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderUsername: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ["TEXT", "QUICK_MESSAGE"],
      required: true,
      default: "TEXT",
    },
    content: {
      type: String,
      required: true,
      maxlength: 500,
    },
    quickMessageId: {
      type: String,
      required: false,
    },
    chatType: {
      type: String,
      enum: ["ROOM", "DIRECT"],
      required: true,
      default: "ROOM",
    },
    filtered: {
      type: Boolean,
      default: false,
    },
    originalContent: {
      type: String,
      required: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      required: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ChatMessageSchema.index({ roomId: 1, timestamp: -1 }); // Get messages for room
ChatMessageSchema.index({ senderId: 1, timestamp: -1 }); // Get messages by user
ChatMessageSchema.index({ conversationId: 1, timestamp: -1 }); // Get direct messages
ChatMessageSchema.index({ recipientId: 1, read: 1, timestamp: -1 }); // Unread messages
ChatMessageSchema.index({ timestamp: 1 }); // For cleanup of old messages

// TTL index - delete messages after 30 days
ChatMessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Pre-save hook to generate messageId if not provided
ChatMessageSchema.pre("save", function (next) {
  if (!this.messageId) {
    this.messageId = `msg_${this._id.toString()}`;
  }
  next();
});

const ChatMessage = mongoose.model<IChatMessage>(
  "ChatMessage",
  ChatMessageSchema
);

export default ChatMessage;
