import { Server, Socket } from "socket.io";
import { createServer } from "http";
import app from "../app";
import { gameEvents } from "./game.socket";
import Friendship from "../models/Friendship.model";

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const onlineUsers = new Map<string, string>();

// Attach game events
gameEvents(io, onlineUsers);

/**
 * Emit friend request received event
 * Called from friends.service when a friend request is sent
 */
export const emitFriendRequestReceived = (recipientId: string, data: any) => {
  try {
    if (!onlineUsers || !io) return;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("friend_request_received", {
        requestId: data.requestId,
        from: {
          userId: data.from.userId,
          username: data.from.username,
          profilePicture: data.from.profilePicture || null,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error emitting friend request received:", error);
  }
};

/**
 * Emit friend request accepted event
 * Called from friends.service when a friend request is accepted
 */
export const emitFriendRequestAccepted = (requesterId: string, data: any) => {
  try {
    if (!onlineUsers || !io) return;
    const requesterSocketId = onlineUsers.get(requesterId);
    if (requesterSocketId) {
      io.to(requesterSocketId).emit("friend_request_accepted", {
        friendId: data.friendId,
        username: data.username,
        profilePicture: data.profilePicture || null,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error emitting friend request accepted:", error);
  }
};

/**
 * Emit you were unfriended event
 * Called from friends.service when a friend is removed
 */
export const emitFriendRemoved = (friendId: string, removerId: string) => {
  try {
    if (!onlineUsers || !io) return;
    const friendSocketId = onlineUsers.get(friendId);
    if (friendSocketId) {
      io.to(friendSocketId).emit("you_were_unfriended", {
        userId: removerId,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error emitting friend removed:", error);
  }
};

/**
 * Emit wallet updated event
 * Called from payment/withdrawal services when wallet balance changes
 */
export const emitWalletUpdated = (userId: string, data: any) => {
  try {
    if (!onlineUsers || !io) return;
    const userSocketId = onlineUsers.get(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("wallet_updated", {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error emitting wallet updated:", error);
  }
};

/**
 * Emit withdrawal completed event
 * Called from withdrawal service when withdrawal is completed
 */
export const emitWithdrawalCompleted = (userId: string, data: any) => {
  try {
    if (!onlineUsers || !io) return;
    const userSocketId = onlineUsers.get(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("withdrawal_completed", {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error emitting withdrawal completed:", error);
  }
};

/**
 * Emit KYC status updated event
 * Called from KYC service when verification status changes
 */
export const emitKYCStatusUpdated = (userId: string, data: any) => {
  try {
    if (!onlineUsers || !io) return;
    const userSocketId = onlineUsers.get(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("kyc_status_updated", {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error emitting KYC status updated:", error);
  }
};

/**
 * Emit notification event
 * Called from notification service when a new notification is created
 */
export const emitNotification = (userId: string, data: any) => {
  try {
    if (!onlineUsers || !io) return;
    const userSocketId = onlineUsers.get(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("notification", {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error emitting notification:", error);
  }
};

/**
 * Emit notification update event
 * Called from notification service when a grouped notification is updated
 */
export const emitNotificationUpdate = (userId: string, data: any) => {
  try {
    if (!onlineUsers || !io) return;
    const userSocketId = onlineUsers.get(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("notification_updated", {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error emitting notification update:", error);
  }
};

/**
 * Emit user muted event
 * Called from chat service when a user is muted by admin
 */
export const emitUserMuted = (userId: string, data: any) => {
  try {
    if (!onlineUsers || !io) return;
    const userSocketId = onlineUsers.get(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("user_muted", {
        reason: data.reason,
        mutedUntil: data.mutedUntil,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error emitting user muted:", error);
  }
};

/**
 * Emit user unmuted event
 * Called from chat service when a user is unmuted
 */
export const emitUserUnmuted = (userId: string) => {
  try {
    if (!onlineUsers || !io) return;
    const userSocketId = onlineUsers.get(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("user_unmuted", {
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error emitting user unmuted:", error);
  }
};
/**
 * Emit friend online event
 * Called from friends service when a friend comes online
 */
export const friendOnlineNotification = async (data: {
  userId: string;
  socketId: string;
  gameMode?: string;
}) => {
  try {
    console.log("🔐 Authentication attempt:", {
      socketId: data.socketId,
      userId: data?.userId,
    });
    const { userId, gameMode } = data;

    if (!userId) {
      console.error("❌ Authentication failed: No userId provided");
      io.to(data.socketId).emit("error", {
        code: "AUTH_MISSING",
        message: "userId required",
      });
      return;
    }

    // Store user socket mapping
    onlineUsers.set(userId, data.socketId);
    data.userId = userId;

    console.log(
      `✅ User ${userId} authenticated and online (gameMode: ${
        gameMode || "none"
      })`
    );

    // Notify friends that user is online
    try {
      console.log("userId", userId);

      const friendships = await Friendship.find({
        userId: userId,
        status: "ACCEPTED",
      }).select("friendId");
      console.log("friendships", friendships);
      const friendIds = friendships.map((f) => f.friendId.toString());
      console.log("friendIds", friendIds);

      friendIds.forEach((friendId) => {
        const friendSocketId = onlineUsers.get(friendId);
        console.log("frndId", friendId, "friendSocketId", friendSocketId);

        if (friendSocketId) {
          io.to(friendSocketId).emit("friend_online", {
            userId: userId,
            gameMode: gameMode || null,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Send grouped notification to friends
      const UserModel = require("../models/User.model").default;
      const user = await UserModel.findById(userId).select("username");
      if (user) {
        const notificationService =
          require("../modules/notification/notification.service").default;
        await notificationService.notifyFriendsOnline(userId, user.username);
      }
      console.log(
        `✅ Authentication complete for ${userId}, notified ${friendIds.length} friends`
      );
    } catch (error) {
      console.error("❌ Error notifying friends of online status:", error);
    }
  } catch (error) {
    console.error("❌ Authentication error:", error);
    io.to(data.socketId).emit("error", {
      code: "AUTH_ERROR",
      message: "Authentication failed",
    });
  }
};

export const chatMessageRecieved = async (data: any, socket: any) => {
  console.log("💬 Chat message received:", {
    socketId: socket.id,
    userId: socket.userId,
    roomId: data?.roomId,
  });
  const userId = socket.userId;

  if (!userId) {
    console.error("❌ Chat message rejected: Not authenticated");
    socket.emit("error", {
      code: "AUTH_001",
      message: "Not authenticated",
    });
    throw new Error("User not authenticated");
  }

  try {
    const { roomId, messageType, content } = data;

    // Validate input
    if (!roomId || !messageType || !content) {
      socket.emit("error", {
        code: "CHAT_VALIDATION",
        message: "Missing required fields",
      });
      throw new Error(
        "Chat message validation failed: Missing required fields"
      );
    }

    // Get username if not in socket data
    let senderUsername = socket?.username;
    if (!senderUsername) {
      const UserModel = require("../models/User.model").default;
      const user = await UserModel.findById(userId).select("username");
      senderUsername = user?.username || "Unknown";
      socket.username = senderUsername;
    }

    // Send message via service
    const chatService = require("../modules/chat/chat.service").default;
    const message = await chatService.sendMessage(
      userId,
      senderUsername,
      roomId,
      messageType,
      content
    );

    // Broadcast to all users in the room
    io.to(roomId).emit("chat_message", message);
    console.log(`✅ Chat message sent to room ${roomId} by ${userId}`);
  } catch (error: any) {
    console.error("❌ Error handling chat message:", error);

    // Send specific error to user
    // socket.emit("error", {
    //   code: error.errorCode || "CHAT_ERROR",
    //   message: error.message || "Failed to send message",
    //   data: error.data || {},
    // });
  }
};

/**
 * Handle direct message event (user-to-user messaging)
 */
export const directMessageReceived = async (data: any, socket: any) => {
  console.log("💬 Direct message received:", {
    socketId: socket.id,
    userId: socket.userId,
    recipientId: data?.recipientId,
  });
  const userId = socket.userId;

  if (!userId) {
    console.error("❌ Direct message rejected: Not authenticated");
    socket.emit("error", {
      code: "AUTH_001",
      message: "Not authenticated",
    });
    return;
  }

  try {
    const { recipientId, messageType, content } = data;

    // Validate input
    if (!recipientId || !messageType || !content) {
      socket.emit("error", {
        code: "CHAT_VALIDATION",
        message: "Missing required fields",
      });
      return;
    }

    // Get username if not in socket data
    let senderUsername = socket?.username;
    if (!senderUsername) {
      const UserModel = require("../models/User.model").default;
      const user = await UserModel.findById(userId).select("username");
      senderUsername = user?.username || "Unknown";
      socket.username = senderUsername;
    }

    // Send message via service
    const chatService = require("../modules/chat/chat.service").default;
    const message = await chatService.sendDirectMessage(
      userId,
      senderUsername,
      recipientId,
      messageType,
      content
    );

    // Emit to sender (confirmation)
    socket.emit("direct_message", message);

    // Emit to recipient if online
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("direct_message", message);
      console.log(`✅ Direct message sent to ${recipientId} by ${userId}`);
    } else {
      console.log(`📭 Recipient ${recipientId} is offline, message stored`);
    }
  } catch (error: any) {
    console.error("❌ Error handling direct message:", error);
    socket.emit("error", {
      code: error.errorCode || "CHAT_ERROR",
      message: error.message || "Failed to send direct message",
      data: error.data || {},
    });
  }
};

export const disconnectUserOffline = async (socket) => {
  console.log("🔌 Socket disconnecting:", socket.id);
  const userId = socket.userId;

  if (userId) {
    onlineUsers.delete(userId);

    console.log(`👋 User ${userId} disconnected`);

    // Notify friends that user is offline
    try {
      const friendships = await Friendship.find({
        userId: userId,
        status: "ACCEPTED",
      }).select("friendId");

      const friendIds = friendships.map((f) => f.friendId.toString());

      friendIds.forEach((friendId) => {
        const friendSocketId = onlineUsers.get(friendId);
        if (friendSocketId) {
          io.to(friendSocketId).emit("friend_offline", {
            userId: userId,
            timestamp: new Date().toISOString(),
          });
        }
      });
    } catch (error) {
      console.error("Error notifying friends of offline status:", error);
    }
  }

  console.log("Base socket disconnected:", socket.id);
};

export { io, httpServer, onlineUsers };
