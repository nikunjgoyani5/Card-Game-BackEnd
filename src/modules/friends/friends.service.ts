import UserModel from "../../models/User.model";
import Friendship from "../../models/Friendship.model";
import GameResult from "../../models/GameResult.model";
import mongoose from "mongoose";
import { CustomError } from "../../utils/customError.utility";
import {
  FRIEND_ERROR,
  MAX_FRIENDS,
  DAILY_FRIEND_REQUEST_LIMIT,
  FRIEND_SEARCH_LIMIT,
} from "../../utils/constants.utility";
import { withTransaction } from "../../utils/transaction.utility";
import redisClient from "../../config/redis";

const ObjectId = mongoose.Types.ObjectId;

class FriendsService {
  /**
   * Search for users by username or email
   * Excludes: current user, already friends, blocked users
   */
  async searchUsers(
    userId: string,
    query: string,
    limit: number = FRIEND_SEARCH_LIMIT
  ) {
    try {
      // Get current friendships to exclude
      const existingFriendships = await Friendship.find({
        userId: new ObjectId(userId),
        status: { $in: ["ACCEPTED", "PENDING", "BLOCKED"] },
      }).select("friendId");

      const excludedUserIds = existingFriendships.map((f) => f.friendId);
      excludedUserIds.push(new ObjectId(userId)); // Exclude self

      // Search users
      const users = await UserModel.find({
        _id: { $nin: excludedUserIds },
        $or: [
          { username: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      })
        .select("username email profilePicture")
        .limit(limit)
        .lean();

      // Get stats for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const stats = await GameResult.aggregate([
            { $match: { userId: user._id } },
            {
              $group: {
                _id: null,
                totalGames: { $sum: 1 },
              },
            },
          ]);

          return {
            userId: user._id,
            username: user.username,
            profilePicture: user.profilePicture || null,
            totalGames: stats[0]?.totalGames || 0,
            friendStatus: "NOT_FRIEND",
          };
        })
      );

      return {
        users: usersWithStats,
        total: usersWithStats.length,
      };
    } catch (error: any) {
      console.error("Error searching users:", error);
      throw new CustomError(error.message || "Failed to search users", 500);
    }
  }

  /**
   * Send friend request
   * Validates: daily limit, friend count limits, existing relationship
   */
  async sendFriendRequest(userId: string, friendId: string) {
    try {
      // Validate user IDs
      if (userId === friendId) {
        throw new CustomError("Cannot add yourself as a friend", 400);
      }

      // Check if target user exists
      const targetUser = await UserModel.findById(friendId);
      if (!targetUser) {
        const error: any = new Error("User not found");
        error.code = FRIEND_ERROR.USER_NOT_FOUND;
        throw error;
      }

      // Check daily request limit via Redis
      if (redisClient) {
        const requestKey = `friend_requests:${userId}:${
          new Date().toISOString().split("T")[0]
        }`;
        const requestCount = await redisClient.get(requestKey);

        if (
          requestCount &&
          parseInt(requestCount) >= DAILY_FRIEND_REQUEST_LIMIT
        ) {
          const error: any = new Error(
            "Daily friend request limit reached (20/day)"
          );
          error.code = FRIEND_ERROR.DAILY_LIMIT_REACHED;
          throw error;
        }
      }

      // Check sender friend count
      const senderFriendCount = await Friendship.countDocuments({
        userId: new ObjectId(userId),
        status: "ACCEPTED",
      });

      if (senderFriendCount >= MAX_FRIENDS) {
        const error: any = new Error("Friend limit reached (500 max)");
        error.code = FRIEND_ERROR.FRIEND_LIMIT_REACHED;
        throw error;
      }

      // Check recipient friend count
      const recipientFriendCount = await Friendship.countDocuments({
        userId: new ObjectId(friendId),
        status: "ACCEPTED",
      });

      if (recipientFriendCount >= MAX_FRIENDS) {
        const error: any = new Error("Recipient has reached friend limit");
        error.code = FRIEND_ERROR.FRIEND_LIMIT_REACHED;
        throw error;
      }

      // Check existing relationship
      const existingFriendship = await Friendship.findOne({
        $or: [
          { userId: new ObjectId(userId), friendId: new ObjectId(friendId) },
          { userId: new ObjectId(friendId), friendId: new ObjectId(userId) },
        ],
      });

      if (existingFriendship) {
        if (existingFriendship.status === "ACCEPTED") {
          const error: any = new Error("Already friends with this user");
          error.code = FRIEND_ERROR.ALREADY_FRIENDS;
          throw error;
        }
        if (existingFriendship.status === "PENDING") {
          const error: any = new Error("Friend request already pending");
          error.code = FRIEND_ERROR.PENDING_REQUEST;
          throw error;
        }
        if (existingFriendship.status === "BLOCKED") {
          const error: any = new Error(
            "Cannot send friend request to this user"
          );
          error.code = FRIEND_ERROR.CANNOT_SEND_REQUEST;
          throw error;
        }
      }

      // Create friendship in transaction
      const result = await withTransaction(async (session) => {
        const friendship = new Friendship({
          userId: new ObjectId(userId),
          friendId: new ObjectId(friendId),
          status: "PENDING",
          requesterId: new ObjectId(userId),
          requestedAt: new Date(),
        });

        await friendship.save({ session });

        // Increment daily request count in Redis
        if (redisClient) {
          const requestKey = `friend_requests:${userId}:${
            new Date().toISOString().split("T")[0]
          }`;
          await redisClient.incr(requestKey);
          await redisClient.expire(requestKey, 86400); // 24 hours
        }

        return friendship;
      });

      // Get remaining requests for today
      let requestsRemainingToday = DAILY_FRIEND_REQUEST_LIMIT;
      if (redisClient) {
        const requestKey = `friend_requests:${userId}:${
          new Date().toISOString().split("T")[0]
        }`;
        const requestCount = await redisClient.get(requestKey);
        requestsRemainingToday =
          DAILY_FRIEND_REQUEST_LIMIT - parseInt(requestCount || "0");
      }

      // Emit socket event to recipient
      try {
        const senderUser = await UserModel.findById(userId).select(
          "username profilePicture"
        );

        // Lazy load socket functions to avoid circular dependency
        const { emitFriendRequestReceived } = await import(
          "../../socket/index"
        );
        emitFriendRequestReceived(friendId, {
          requestId: result.friendshipId,
          from: {
            userId: userId,
            username: senderUser?.username,
            profilePicture: senderUser?.profilePicture,
          },
        });

        // Send notification
        const notificationService =
          require("../notification/notification.service").default;
        await notificationService.sendNotification(friendId, {
          type: "FRIEND_REQUEST_RECEIVED",
          title: "New Friend Request",
          message: `${senderUser?.username} sent you a friend request`,
          data: {
            requestId: result.friendshipId,
            userId: userId,
            username: senderUser?.username,
          },
          priority: "NORMAL",
        });
      } catch (socketError) {
        console.error(
          "Error emitting friend request socket event:",
          socketError
        );
        // Don't fail the request if socket fails
      }

      return {
        requestId: result.friendshipId,
        friendId: friendId,
        status: "PENDING",
        requestsRemainingToday,
      };
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      throw error;
    }
  }

  /**
   * Accept friend request
   * Creates bidirectional friendship records
   */
  async acceptFriendRequest(userId: string, requestId: string) {
    try {
      // Find the pending request
      const friendship = await Friendship.findOne({
        friendshipId: requestId,
        friendId: new ObjectId(userId),
        status: "PENDING",
      });

      if (!friendship) {
        const error: any = new Error("Friend request not found");
        error.code = FRIEND_ERROR.REQUEST_NOT_FOUND;
        throw error;
      }

      // Accept in transaction (create bidirectional records)
      const result = await withTransaction(async (session) => {
        // Update original request
        friendship.status = "ACCEPTED";
        friendship.acceptedAt = new Date();
        await friendship.save({ session });

        // Create reverse friendship
        const reverseFriendship = new Friendship({
          userId: friendship.friendId,
          friendId: friendship.userId,
          status: "ACCEPTED",
          requesterId: friendship.requesterId,
          requestedAt: friendship.requestedAt,
          acceptedAt: new Date(),
        });

        await reverseFriendship.save({ session });

        return friendship;
      });

      // Get friend details
      const friendUser = await UserModel.findById(result.userId).select(
        "username profilePicture"
      );
      const currentUser = await UserModel.findById(userId).select(
        "username profilePicture"
      );

      // Emit socket event to requester
      try {
        // Lazy load socket functions to avoid circular dependency
        const { emitFriendRequestAccepted } = await import(
          "../../socket/index"
        );
        emitFriendRequestAccepted(result.userId.toString(), {
          friendId: userId,
          username: currentUser?.username,
          profilePicture: currentUser?.profilePicture,
        });

        // Send notification
        const notificationService =
          require("../notification/notification.service").default;
        await notificationService.sendNotification(result.userId.toString(), {
          type: "FRIEND_REQUEST_ACCEPTED",
          title: "Friend Request Accepted",
          message: `${currentUser?.username} accepted your friend request`,
          data: {
            friendId: userId,
            username: currentUser?.username,
            profilePicture: currentUser?.profilePicture,
          },
          priority: "NORMAL",
        });
      } catch (socketError) {
        console.error(
          "Error emitting friend accepted socket event:",
          socketError
        );
        // Don't fail the request if socket fails
      }

      return {
        friendId: result.userId.toString(),
        username: friendUser?.username,
        profilePicture: friendUser?.profilePicture,
        status: "ACCEPTED",
      };
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      throw error;
    }
  }

  /**
   * Reject friend request
   * Simply deletes the pending request
   */
  async rejectFriendRequest(userId: string, requestId: string) {
    try {
      const friendship = await Friendship.findOne({
        friendshipId: requestId,
        friendId: new ObjectId(userId),
        status: "PENDING",
      });

      if (!friendship) {
        const error: any = new Error("Friend request not found");
        error.code = FRIEND_ERROR.REQUEST_NOT_FOUND;
        throw error;
      }

      await Friendship.deleteOne({ _id: friendship._id });

      return { success: true };
    } catch (error: any) {
      console.error("Error rejecting friend request:", error);
      throw error;
    }
  }

  /**
   * Remove friend
   * Deletes both bidirectional friendship records
   */
  async removeFriend(userId: string, friendId: string) {
    try {
      await withTransaction(async (session) => {
        // Delete both directions
        await Friendship.deleteMany(
          {
            $or: [
              {
                userId: new ObjectId(userId),
                friendId: new ObjectId(friendId),
                status: "ACCEPTED",
              },
              {
                userId: new ObjectId(friendId),
                friendId: new ObjectId(userId),
                status: "ACCEPTED",
              },
            ],
          },
          { session }
        );
      });

      // Emit socket event to friend
      try {
        // Lazy load socket functions to avoid circular dependency
        const { emitFriendRemoved } = await import("../../socket/index");
        emitFriendRemoved(friendId, userId);
      } catch (socketError) {
        console.error(
          "Error emitting friend removed socket event:",
          socketError
        );
        // Don't fail the request if socket fails
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error removing friend:", error);
      throw new CustomError("Failed to remove friend", 500);
    }
  }

  /**
   * Get friend list with online status
   */
  async getFriendList(userId: string) {
    try {
      const friendships = await Friendship.find({
        userId: new ObjectId(userId),
        status: "ACCEPTED",
      })
        .populate("friendId", "username profilePicture")
        .sort({ lastInteraction: -1 })
        .lean();

      const friendsWithStatus = await Promise.all(
        friendships.map(async (friendship: any) => {
          const friendId = friendship.friendId._id.toString();

          // Get online status from Redis
          let onlineStatus = {
            isOnline: false,
            currentGameMode: null,
            inGame: false,
            lastSeen: null,
          };

          if (redisClient) {
            const statusStr = await redisClient.get(`online:${friendId}`);
            if (statusStr) {
              const status = JSON.parse(statusStr);
              onlineStatus = {
                isOnline: true,
                currentGameMode: status.currentGameMode,
                inGame: status.inGame || false,
                lastSeen: null,
              };
            } else {
              // Try to get last seen
              const lastSeen = await redisClient.get(`last_seen:${friendId}`);
              onlineStatus.lastSeen = lastSeen || friendship.lastInteraction;
            }
          }

          return {
            userId: friendId,
            username: friendship.friendId.username,
            profilePicture: friendship.friendId.profilePicture || null,
            isOnline: onlineStatus.isOnline,
            currentGameMode: onlineStatus.currentGameMode,
            inGame: onlineStatus.inGame,
            lastSeen: onlineStatus.lastSeen,
            gamesPlayedTogether: friendship.gamesPlayedTogether || 0,
          };
        })
      );

      const onlineCount = friendsWithStatus.filter((f) => f.isOnline).length;

      return {
        friends: friendsWithStatus,
        total: friendsWithStatus.length,
        onlineCount,
      };
    } catch (error: any) {
      console.error("Error getting friend list:", error);
      throw new CustomError("Failed to get friend list", 500);
    }
  }

  /**
   * Get pending friend requests (received and sent)
   */
  async getFriendRequests(userId: string) {
    try {
      // Received requests (where current user is friendId)
      const receivedRequests = await Friendship.find({
        friendId: new ObjectId(userId),
        status: "PENDING",
      })
        .populate("userId", "username profilePicture")
        .sort({ requestedAt: -1 })
        .lean();

      // Sent requests (where current user is userId)
      const sentRequests = await Friendship.find({
        userId: new ObjectId(userId),
        status: "PENDING",
      })
        .populate("friendId", "username profilePicture")
        .sort({ requestedAt: -1 })
        .lean();

      const received = receivedRequests.map((req: any) => ({
        requestId: req.friendshipId,
        userId: req.userId._id.toString(),
        username: req.userId.username,
        profilePicture: req.userId.profilePicture || null,
        requestedAt: req.requestedAt,
      }));

      const sent = sentRequests.map((req: any) => ({
        requestId: req.friendshipId,
        userId: req.friendId._id.toString(),
        username: req.friendId.username,
        profilePicture: req.friendId.profilePicture || null,
        requestedAt: req.requestedAt,
      }));

      return {
        received,
        sent,
      };
    } catch (error: any) {
      console.error("Error getting friend requests:", error);
      throw new CustomError("Failed to get friend requests", 500);
    }
  }

  /**
   * Get public profile of any user
   */
  async getUserProfile(currentUserId: string, targetUserId: string) {
    try {
      const user = await UserModel.findById(targetUserId).select(
        "username profilePicture createdAt"
      );

      if (!user) {
        const error: any = new Error("User not found");
        error.code = FRIEND_ERROR.USER_NOT_FOUND;
        throw error;
      }

      // Get stats
      const stats = await GameResult.aggregate([
        { $match: { userId: new ObjectId(targetUserId) } },
        {
          $group: {
            _id: null,
            totalGames: { $sum: 1 },
            totalWinAmount: {
              $sum: { $cond: [{ $gt: ["$winAmount", 0] }, "$winAmount", 0] },
            },
            totalLossAmount: {
              $sum: {
                $cond: [{ $lt: ["$winAmount", 0] }, { $abs: "$winAmount" }, 0],
              },
            },
          },
        },
      ]);

      const gameStats = stats[0] || {
        totalGames: 0,
        totalWinAmount: 0,
        totalLossAmount: 0,
      };
      const netProfit = gameStats.totalWinAmount - gameStats.totalLossAmount;
      const winRate =
        gameStats.totalGames > 0
          ? (
              (gameStats.totalWinAmount /
                (gameStats.totalWinAmount + gameStats.totalLossAmount)) *
              100
            ).toFixed(1)
          : 0;

      // Check friendship status
      const friendship = await Friendship.findOne({
        userId: new ObjectId(currentUserId),
        friendId: new ObjectId(targetUserId),
      });

      const isFriend = friendship?.status === "ACCEPTED";

      // Get online status
      let isOnline = false;
      let lastSeen: string | null = null;

      if (redisClient) {
        const statusStr = await redisClient.get(`online:${targetUserId}`);
        if (statusStr) {
          isOnline = true;
        } else {
          const lastSeenStr = await redisClient.get(
            `last_seen:${targetUserId}`
          );
          lastSeen =
            lastSeenStr ||
            (user.createdAt ? user.createdAt.toISOString() : null);
        }
      }

      return {
        userId: user._id.toString(),
        username: user.username,
        profilePicture: user?.profilePicture || null,
        joinedDate: user.createdAt,
        stats: {
          totalGames: gameStats.totalGames,
          totalWinAmount: Math.round(gameStats.totalWinAmount * 100) / 100,
          totalLossAmount: Math.round(gameStats.totalLossAmount * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          winRate: parseFloat(winRate as string),
          badges: [], // TODO: Implement badge system
        },
        isFriend,
        isOnline,
        lastSeen,
      };
    } catch (error: any) {
      console.error("Error getting user profile:", error);
      throw error;
    }
  }

  /**
   * Update games played together counter
   * Called after a game completes
   */
  async updateGamesPlayedTogether(userId: string, friendId: string) {
    try {
      await Friendship.updateMany(
        {
          $or: [
            {
              userId: new ObjectId(userId),
              friendId: new ObjectId(friendId),
              status: "ACCEPTED",
            },
            {
              userId: new ObjectId(friendId),
              friendId: new ObjectId(userId),
              status: "ACCEPTED",
            },
          ],
        },
        {
          $inc: { gamesPlayedTogether: 1 },
          $set: { lastInteraction: new Date() },
        }
      );
    } catch (error: any) {
      console.error("Error updating games played together:", error);
      // Don't throw - this is not critical
    }
  }

  // ===== LEGACY METHODS (Keep for backward compatibility) =====

  async getNonFriends(userId: string, username?: string) {
    return this.searchUsers(userId, username || "", 20);
  }

  async sendInvite(userId: string, targetUserId: string) {
    const result = await this.sendFriendRequest(userId, targetUserId);
    return "Friend request sent successfully";
  }

  async getFriends(userId: string, username?: string) {
    const result = await this.getFriendList(userId);
    return result.friends;
  }

  async handleRequest(userId: string, requesterId: string, action: string) {
    // Find the request
    const friendship = await Friendship.findOne({
      userId: new ObjectId(requesterId),
      friendId: new ObjectId(userId),
      status: "PENDING",
    });

    if (!friendship) {
      throw new CustomError("No friend request found", 404);
    }

    if (action === "accept") {
      await this.acceptFriendRequest(userId, friendship.friendshipId);
      return "Friend request accepted";
    } else {
      await this.rejectFriendRequest(userId, friendship.friendshipId);
      return "Friend request rejected";
    }
  }
}

export default new FriendsService();
``;
