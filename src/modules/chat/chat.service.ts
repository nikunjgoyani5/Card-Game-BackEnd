import mongoose from "mongoose";
import ChatMessage from "../../models/ChatMessage.model";
import Room from "../../models/Room.model";
import UserModel from "../../models/User.model";
import redis from "../../config/redis";
import {
  QUICK_MESSAGES,
  CHAT_ERROR_CODES,
  CHAT_RATE_LIMIT,
  CHAT_CONFIG,
} from "../../utils/chat.utility";

const { ObjectId } = mongoose.Types;

// Simple profanity filter (can be replaced with a library like 'bad-words')
const PROFANITY_LIST = [
  "badword1",
  "badword2",
  "offensive",
  // Add more words as needed
];

class ChatService {
  /**
   * Filter profanity from text
   */
  private filterProfanity(text: string): {
    clean: string;
    filtered: boolean;
  } {
    let clean = text;
    let filtered = false;

    // Convert to lowercase for checking
    const lowerText = text.toLowerCase();

    // Replace profanity with asterisks
    PROFANITY_LIST.forEach((word) => {
      const regex = new RegExp(word, "gi");
      if (regex.test(lowerText)) {
        filtered = true;
        clean = clean.replace(regex, "*".repeat(word.length));
      }
    });

    // Also check for common letter substitutions (l33t speak)
    const substitutions: Record<string, string> = {
      "@": "a",
      "0": "o",
      "1": "i",
      "3": "e",
      "4": "a",
      "5": "s",
      "7": "t",
      "8": "b",
    };

    let normalizedText = lowerText;
    Object.entries(substitutions).forEach(([symbol, letter]) => {
      normalizedText = normalizedText.replace(new RegExp(symbol, "g"), letter);
    });

    // Check normalized text
    PROFANITY_LIST.forEach((word) => {
      const regex = new RegExp(word, "gi");
      if (regex.test(normalizedText) && !filtered) {
        filtered = true;
        // Find and replace the obfuscated version in original text
        const pattern = word
          .split("")
          .map((char) => {
            const subs = Object.entries(substitutions).find(
              ([_, letter]) => letter === char
            );
            return subs ? `[${char}${subs[0]}]` : char;
          })
          .join("");
        clean = clean.replace(
          new RegExp(pattern, "gi"),
          "*".repeat(word.length)
        );
      }
    });

    return { clean, filtered };
  }

  /**
   * Check if user is muted
   */
  async isUserMuted(userId: string): Promise<{
    muted: boolean;
    mutedUntil?: Date;
    reason?: string;
  }> {
    const mutedData = await redis.get(`muted:${userId}`);
    if (!mutedData) {
      return { muted: false };
    }

    try {
      const data = JSON.parse(mutedData);
      return {
        muted: true,
        mutedUntil: new Date(data.mutedUntil),
        reason: data.reason,
      };
    } catch {
      return { muted: false };
    }
  }

  /**
   * Check rate limit for user
   */
  async checkRateLimit(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
  }> {
    const key = `chat:ratelimit:${userId}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, CHAT_RATE_LIMIT.WINDOW_SECONDS);
    }

    const remaining = Math.max(
      0,
      CHAT_RATE_LIMIT.MAX_MESSAGES_PER_MINUTE - count
    );

    return {
      allowed: count <= CHAT_RATE_LIMIT.MAX_MESSAGES_PER_MINUTE,
      remaining,
    };
  }

  /**
   * Validate user can send chat in room
   */
  async validateChatAccess(
    userId: string,
    roomId: string
  ): Promise<{ valid: boolean; error?: string }> {
    // Check if room exists
    const room = await Room.findOne({
      roomId,
    });

    if (!room) {
      return {
        valid: false,
        error: CHAT_ERROR_CODES.CHAT_006,
      };
    }

    // Check if user is in room
    const isPlayerInRoom = room.players.some(
      (p: any) => p.userId.toString() === userId
    );

    if (!isPlayerInRoom) {
      return {
        valid: false,
        error: CHAT_ERROR_CODES.CHAT_001,
      };
    }

    // Check if game hasn't started (only lobby chat)
    if (room.status !== "WAITING") {
      return {
        valid: false,
        error: CHAT_ERROR_CODES.CHAT_007,
      };
    }

    return { valid: true };
  }

  /**
   * Send chat message
   */
  async sendMessage(
    userId: string,
    username: string,
    roomId: string,
    messageType: "TEXT" | "QUICK_MESSAGE",
    content: string
  ): Promise<any> {
    try {
      // Validate access
      const accessValidation = await this.validateChatAccess(userId, roomId);
      if (!accessValidation.valid) {
        const error: any = new Error(accessValidation.error);
        error.statusCode = 403;
        error.errorCode = accessValidation.error;
        throw error;
      }

      // Check if user is muted
      const muteStatus = await this.isUserMuted(userId);
      if (muteStatus.muted) {
        const error: any = new Error(CHAT_ERROR_CODES.CHAT_002);
        error.statusCode = 403;
        error.errorCode = "CHAT_002";
        error.data = {
          mutedUntil: muteStatus.mutedUntil,
          reason: muteStatus.reason,
        };
        throw error;
      }

      // Check rate limit
      const rateLimitStatus = await this.checkRateLimit(userId);
      if (!rateLimitStatus.allowed) {
        const error: any = new Error(CHAT_ERROR_CODES.CHAT_003);
        error.statusCode = 429;
        error.errorCode = "CHAT_003";
        throw error;
      }

      let finalContent = content;
      let filtered = false;
      let originalContent: string | undefined;
      let quickMessageId: string | undefined;

      if (messageType === "TEXT") {
        // Validate length
        if (content.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
          const error: any = new Error(CHAT_ERROR_CODES.CHAT_004);
          error.statusCode = 400;
          error.errorCode = "CHAT_004";
          throw error;
        }

        // Apply profanity filter
        const filterResult = this.filterProfanity(content);
        if (filterResult.filtered) {
          filtered = true;
          originalContent = content;
          finalContent = filterResult.clean;
        }
      } else if (messageType === "QUICK_MESSAGE") {
        // Validate quick message ID
        if (!QUICK_MESSAGES[content]) {
          const error: any = new Error(CHAT_ERROR_CODES.CHAT_005);
          error.statusCode = 400;
          error.errorCode = "CHAT_005";
          throw error;
        }
        quickMessageId = content;
        finalContent = QUICK_MESSAGES[content];
      }

      // Find room to get ObjectId
      const room = await Room.findOne({ roomId });
      if (!room) {
        const error: any = new Error(CHAT_ERROR_CODES.CHAT_006);
        error.statusCode = 404;
        error.errorCode = "CHAT_006";
        throw error;
      }

      // Create message
      const message = await ChatMessage.create({
        roomId: room._id,
        senderId: new ObjectId(userId),
        senderUsername: username,
        messageType,
        content: finalContent,
        quickMessageId,
        filtered,
        originalContent,
        timestamp: new Date(),
      });

      return {
        messageId: message.messageId,
        roomId,
        senderId: userId,
        senderUsername: username,
        messageType,
        content: finalContent,
        filtered,
        timestamp: message.timestamp,
      };
    } catch (error: any) {
      console.error("Error sending chat message:", error);
      throw error;
    }
  }

  /**
   * Get chat history for a room
   */
  async getChatHistory(
    roomId: string,
    limit: number = CHAT_CONFIG.MAX_HISTORY_MESSAGES
  ): Promise<any[]> {
    try {
      // Find room to get ObjectId
      const room = await Room.findOne({ roomId });
      if (!room) {
        return [];
      }

      // Get recent messages
      const messages = await ChatMessage.find({
        roomId: room._id,
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      // Reverse to get chronological order
      return messages.reverse().map((msg) => ({
        messageId: msg.messageId,
        roomId,
        senderId: msg.senderId.toString(),
        senderUsername: msg.senderUsername,
        messageType: msg.messageType,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
    } catch (error: any) {
      console.error("Error fetching chat history:", error);
      throw error;
    }
  }

  /**
   * Mute user
   */
  async muteUser(
    userId: string,
    duration: number,
    reason: string,
    adminId: string
  ): Promise<void> {
    try {
      const mutedUntil = new Date(Date.now() + duration * 60 * 1000);

      const muteData = {
        mutedUntil: mutedUntil.toISOString(),
        reason,
        mutedBy: adminId,
        mutedAt: new Date().toISOString(),
      };

      // Store in Redis with expiry
      await redis.setex(
        `muted:${userId}`,
        duration * 60,
        JSON.stringify(muteData)
      );

      // Emit socket event to notify user
      try {
        const { emitUserMuted } = require("../../socket/index");
        emitUserMuted(userId, { reason, mutedUntil });
      } catch (socketError) {
        console.error("Error emitting user_muted event:", socketError);
      }

      console.log(
        `User ${userId} muted until ${mutedUntil} by admin ${adminId}. Reason: ${reason}`
      );
    } catch (error: any) {
      console.error("Error muting user:", error);
      throw error;
    }
  }

  /**
   * Unmute user
   */
  async unmuteUser(userId: string): Promise<void> {
    try {
      await redis.del(`muted:${userId}`);

      // Emit socket event to notify user
      try {
        const { emitUserUnmuted } = require("../../socket/index");
        emitUserUnmuted(userId);
      } catch (socketError) {
        console.error("Error emitting user_unmuted event:", socketError);
      }

      console.log(`User ${userId} unmuted`);
    } catch (error: any) {
      console.error("Error unmuting user:", error);
      throw error;
    }
  }

  /**
   * Get quick messages
   */
  getQuickMessages(): Record<string, string> {
    return QUICK_MESSAGES;
  }

  /**
   * Generate conversation ID for two users (always sorted to be consistent)
   */
  private generateConversationId(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort();
    return `conv_${sorted[0]}_${sorted[1]}`;
  }

  /**
   * Send direct message to another user
   */
  async sendDirectMessage(
    senderId: string,
    senderUsername: string,
    recipientId: string,
    messageType: "TEXT" | "QUICK_MESSAGE",
    content: string
  ): Promise<any> {
    try {
      // Check if sender is muted
      const muteStatus = await this.isUserMuted(senderId);
      if (muteStatus.muted) {
        const error: any = new Error(CHAT_ERROR_CODES.CHAT_002);
        error.statusCode = 403;
        error.errorCode = "CHAT_002";
        error.data = {
          mutedUntil: muteStatus.mutedUntil,
          reason: muteStatus.reason,
        };
        throw error;
      }

      // Check rate limit
      const rateLimitStatus = await this.checkRateLimit(senderId);
      if (!rateLimitStatus.allowed) {
        const error: any = new Error(CHAT_ERROR_CODES.CHAT_003);
        error.statusCode = 429;
        error.errorCode = "CHAT_003";
        throw error;
      }

      // Verify recipient exists
      const recipient = await UserModel.findById(recipientId);
      if (!recipient) {
        const error: any = new Error("Recipient not found");
        error.statusCode = 404;
        throw error;
      }

      // Cannot send message to self
      if (senderId === recipientId) {
        const error: any = new Error("Cannot send message to yourself");
        error.statusCode = 400;
        throw error;
      }

      let finalContent = content;
      let filtered = false;
      let originalContent: string | undefined;
      let quickMessageId: string | undefined;

      if (messageType === "TEXT") {
        // Validate length
        if (content.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
          const error: any = new Error(CHAT_ERROR_CODES.CHAT_004);
          error.statusCode = 400;
          error.errorCode = "CHAT_004";
          throw error;
        }

        // Apply profanity filter
        const filterResult = this.filterProfanity(content);
        if (filterResult.filtered) {
          filtered = true;
          originalContent = content;
          finalContent = filterResult.clean;
        }
      } else if (messageType === "QUICK_MESSAGE") {
        // Validate quick message ID
        if (!QUICK_MESSAGES[content]) {
          const error: any = new Error("Invalid quick message ID");
          error.statusCode = 400;
          throw error;
        }
        quickMessageId = content;
        finalContent = QUICK_MESSAGES[content];
      }

      // Generate conversation ID
      const conversationId = this.generateConversationId(senderId, recipientId);

      // Create message
      const message = await ChatMessage.create({
        senderId: new ObjectId(senderId),
        senderUsername,
        recipientId: new ObjectId(recipientId),
        conversationId,
        chatType: "DIRECT",
        messageType,
        content: finalContent,
        quickMessageId,
        filtered,
        originalContent,
        read: false,
        timestamp: new Date(),
      });

      return {
        messageId: message.messageId,
        senderId,
        senderUsername,
        recipientId,
        conversationId,
        messageType,
        content: finalContent,
        filtered,
        read: false,
        timestamp: message.timestamp,
      };
    } catch (error: any) {
      console.error("Error sending direct message:", error);
      throw error;
    }
  }

  /**
   * Get direct message history between two users
   */
  async getDirectMessageHistory(
    userId1: string,
    userId2: string,
    limit: number = CHAT_CONFIG.MAX_HISTORY_MESSAGES
  ): Promise<any[]> {
    try {
      const conversationId = this.generateConversationId(userId1, userId2);

      // Get messages
      const messages = await ChatMessage.find({
        conversationId,
        chatType: "DIRECT",
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      // Mark messages as read for userId1 (the requester)
      await ChatMessage.updateMany(
        {
          conversationId,
          recipientId: new ObjectId(userId1),
          read: false,
        },
        {
          $set: { read: true, readAt: new Date() },
        }
      );

      // Reverse to get chronological order
      return messages.reverse().map((msg) => ({
        messageId: msg.messageId,
        senderId: msg.senderId.toString(),
        senderUsername: msg.senderUsername,
        recipientId: msg.recipientId?.toString(),
        conversationId: msg.conversationId,
        messageType: msg.messageType,
        content: msg.content,
        read: msg.read,
        timestamp: msg.timestamp,
      }));
    } catch (error: any) {
      console.error("Error fetching direct message history:", error);
      throw error;
    }
  }

  /**
   * Get list of conversations for a user with last message and unread count
   */
  async getConversationList(userId: string): Promise<any[]> {
    try {
      // Get all conversations where user is sender or recipient
      const conversations = await ChatMessage.aggregate([
        {
          $match: {
            chatType: "DIRECT",
            $or: [
              { senderId: new ObjectId(userId) },
              { recipientId: new ObjectId(userId) },
            ],
          },
        },
        {
          $sort: { timestamp: -1 },
        },
        {
          $group: {
            _id: "$conversationId",
            lastMessage: { $first: "$$ROOT" },
            unreadCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$recipientId", new ObjectId(userId)] },
                      { $eq: ["$read", false] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $sort: { "lastMessage.timestamp": -1 },
        },
      ]);

      // Get user details for each conversation
      const result = await Promise.all(
        conversations.map(async (conv) => {
          const lastMsg = conv.lastMessage;

          // Determine the other user in the conversation
          const otherUserId =
            lastMsg.senderId.toString() == userId
              ? lastMsg.recipientId
              : lastMsg.senderId;

          const otherUser = await UserModel.findById(otherUserId).select(
            "userId username profilePicture"
          );

          return {
            conversationId: conv._id,
            otherUser: {
              userId: otherUser?.userId || otherUser?._id.toString(),
              username: otherUser?.username,
              profilePicture: otherUser?.profilePicture,
            },
            lastMessage: {
              messageId: lastMsg.messageId,
              senderId: lastMsg.senderId.toString(),
              content: lastMsg.content,
              timestamp: lastMsg.timestamp,
              read: lastMsg.read,
            },
            unreadCount: conv.unreadCount,
          };
        })
      );

      return result;
    } catch (error: any) {
      console.error("Error fetching conversation list:", error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      await ChatMessage.updateMany(
        {
          conversationId,
          recipientId: new ObjectId(userId),
          read: false,
        },
        {
          $set: { read: true, readAt: new Date() },
        }
      );
    } catch (error: any) {
      console.error("Error marking messages as read:", error);
      throw error;
    }
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await ChatMessage.countDocuments({
        recipientId: new ObjectId(userId),
        chatType: "DIRECT",
        read: false,
      });

      return count;
    } catch (error: any) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }
}

export default new ChatService();
