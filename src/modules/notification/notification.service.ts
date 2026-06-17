import mongoose from "mongoose";
import Notification from "../../models/Notification.model";
import NotificationPreferences from "../../models/NotificationPreferences.model";
import Friendship from "../../models/Friendship.model";

const ObjectId = mongoose.Types.ObjectId;

// Type mapping for notification preferences
const TYPE_TO_PREFERENCE_KEY: Record<string, string> = {
  FRIEND_REQUEST_RECEIVED: "friendRequests",
  FRIEND_REQUEST_ACCEPTED: "friendRequests",
  GAME_INVITATION: "gameInvitations",
  GAME_REMINDER_15MIN: "scheduledGameReminders",
  GAME_REMINDER_5MIN: "scheduledGameReminders",
  FRIENDS_ONLINE: "friendsOnline",
  DEPOSIT_COMPLETED: "transactions",
  WITHDRAWAL_COMPLETED: "transactions",
  KYC_APPROVED: "transactions",
  KYC_REJECTED: "transactions",
  NEW_FEATURE: "newFeatures",
  SYSTEM_ANNOUNCEMENT: "systemAnnouncements",
};

class NotificationService {
  /**
   * Send notification to user
   */
  async sendNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      data?: any;
      priority?: "HIGH" | "NORMAL" | "LOW";
    }
  ) {
    try {
      // Get user preferences
      let prefs = await NotificationPreferences.findOne({
        userId: new ObjectId(userId),
      });

      // Create default preferences if not exists
      if (!prefs) {
        prefs = await NotificationPreferences.create({
          userId: new ObjectId(userId),
          enabled: {
            friendRequests: true,
            gameInvitations: true,
            scheduledGameReminders: true,
            friendsOnline: true,
            transactions: true,
            newFeatures: true,
            systemAnnouncements: true,
          },
          quietHours: {
            enabled: false,
            startTime: "22:00",
            endTime: "08:00",
            timezone: "UTC",
          },
          pushEnabled: true,
          inAppEnabled: true,
        });
      }

      // Check if notification type is enabled
      const typeKey = TYPE_TO_PREFERENCE_KEY[notification.type];
      if (typeKey && !(prefs.enabled as any)[typeKey]) {
        console.log(
          `Notification type ${notification.type} disabled for user ${userId}`
        );
        return; // User disabled this notification type
      }

      // Check quiet hours
      if (prefs.quietHours.enabled) {
        const isQuiet = this.isInQuietHours(
          prefs.quietHours.startTime,
          prefs.quietHours.endTime,
          prefs.quietHours.timezone
        );

        if (isQuiet && notification.priority !== "HIGH") {
          console.log(`Skipping notification for user ${userId} - quiet hours`);
          return;
        }
      }

      // Generate notification ID
      const notificationId = `NOTIF${Date.now()}${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`;

      // Store in database (in-app notification)
      const notif = await Notification.create({
        notificationId,
        userId: new ObjectId(userId),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        channels: ["IN_APP", "PUSH"],
        priority: notification.priority || "NORMAL",
        read: false,
        createdAt: new Date(),
        // Set expiry to 30 days
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Send in-app via Socket.io
      if (prefs.inAppEnabled) {
        this.emitNotification(userId, {
          notificationId: notif.notificationId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority || "NORMAL",
          createdAt: notif.createdAt,
        });
      }

      // TODO: Send push notification if enabled
      // if (prefs.pushEnabled) {
      //   await this.sendPushNotification(userId, {
      //     title: notification.title,
      //     body: notification.message,
      //     data: notification.data,
      //   });
      // }

      return notif;
    } catch (error: any) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(
    startTime: string,
    endTime: string,
    timezone: string
  ): boolean {
    try {
      // Simple time comparison (can be enhanced with timezone libraries)
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      const [startHour, startMin] = startTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;

      const [endHour, endMin] = endTime.split(":").map(Number);
      const endMinutes = endHour * 60 + endMin;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startMinutes > endMinutes) {
        return (
          currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes
        );
      } else {
        return (
          currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes
        );
      }
    } catch (error) {
      console.error("Error checking quiet hours:", error);
      return false;
    }
  }

  /**
   * Send grouped notification for friends coming online
   */
  async notifyFriendsOnline(userId: string, username: string) {
    try {
      // Get user's friends
      const friendships = await Friendship.find({
        friendId: new ObjectId(userId),
        status: "ACCEPTED",
      }).limit(100);

      for (const friendship of friendships) {
        const friendUserId = friendship.userId.toString();

        // Check if group notification exists in last 5 minutes
        const existingGroup = await Notification.findOne({
          userId: new ObjectId(friendUserId),
          type: "FRIENDS_ONLINE",
          createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
        });

        if (existingGroup) {
          // Update existing group
          existingGroup.groupCount = (existingGroup.groupCount || 1) + 1;
          existingGroup.message = `${existingGroup.groupCount} friends are now online`;

          // Add friend to the group
          if (!existingGroup.data) {
            existingGroup.data = { friendIds: [] };
          }
          if (!existingGroup.data.friendIds) {
            existingGroup.data.friendIds = [];
          }
          existingGroup.data.friendIds.push(userId);

          await existingGroup.save();

          // Update Socket.io
          this.emitNotificationUpdate(friendUserId, {
            notificationId: existingGroup.notificationId,
            message: existingGroup.message,
            groupCount: existingGroup.groupCount,
            data: existingGroup.data,
          });
        } else {
          // Create new group notification
          await this.sendNotification(friendUserId, {
            type: "FRIENDS_ONLINE",
            title: "Friends Online",
            message: `${username} is now online`,
            data: {
              friendIds: [userId],
              groupId: `GROUP${Date.now()}`,
            },
            priority: "LOW",
          });
        }
      }
    } catch (error: any) {
      console.error("Error notifying friends online:", error);
    }
  }

  /**
   * Get user's notifications
   */
  async getNotifications(
    userId: string,
    filters: {
      unreadOnly?: boolean;
      type?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const { unreadOnly, type, limit = 50, offset = 0 } = filters;

      const query: any = { userId: new ObjectId(userId) };

      if (unreadOnly) {
        query.read = false;
      }

      if (type) {
        query.type = type;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query),
        Notification.countDocuments({
          userId: new ObjectId(userId),
          read: false,
        }),
      ]);

      return {
        success: true,
        data: {
          notifications,
          unreadCount,
          total,
          pagination: {
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        },
      };
    } catch (error: any) {
      console.error("Error getting notifications:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    try {
      const notification = await Notification.findOne({
        notificationId,
        userId: new ObjectId(userId),
      });

      if (!notification) {
        const error: any = new Error("Notification not found");
        error.code = 404;
        throw error;
      }

      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date();
        await notification.save();
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    try {
      const result = await Notification.updateMany(
        { userId: new ObjectId(userId), read: false },
        { $set: { read: true, readAt: new Date() } }
      );

      return {
        success: true,
        markedCount: result.modifiedCount,
      };
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string) {
    try {
      let prefs = await NotificationPreferences.findOne({
        userId: new ObjectId(userId),
      });

      // Create default preferences if not exists
      if (!prefs) {
        prefs = await NotificationPreferences.create({
          userId: new ObjectId(userId),
          enabled: {
            friendRequests: true,
            gameInvitations: true,
            scheduledGameReminders: true,
            friendsOnline: true,
            transactions: true,
            newFeatures: true,
            systemAnnouncements: true,
          },
          quietHours: {
            enabled: false,
            startTime: "22:00",
            endTime: "08:00",
            timezone: "UTC",
          },
          pushEnabled: true,
          inAppEnabled: true,
        });
      }

      return {
        success: true,
        data: {
          enabled: prefs.enabled,
          quietHours: prefs.quietHours,
          pushEnabled: prefs.pushEnabled,
          inAppEnabled: prefs.inAppEnabled,
        },
      };
    } catch (error: any) {
      console.error("Error getting preferences:", error);
      throw error;
    }
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(userId: string, updates: any) {
    try {
      let prefs = await NotificationPreferences.findOne({
        userId: new ObjectId(userId),
      });

      if (!prefs) {
        prefs = await NotificationPreferences.create({
          userId: new ObjectId(userId),
          ...updates,
        });
      } else {
        if (updates.enabled) {
          prefs.enabled = { ...prefs.enabled, ...updates.enabled };
        }
        if (updates.quietHours) {
          prefs.quietHours = { ...prefs.quietHours, ...updates.quietHours };
        }
        if (updates.pushEnabled !== undefined) {
          prefs.pushEnabled = updates.pushEnabled;
        }
        if (updates.inAppEnabled !== undefined) {
          prefs.inAppEnabled = updates.inAppEnabled;
        }

        await prefs.save();
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error updating preferences:", error);
      throw error;
    }
  }

  /**
   * Emit notification via Socket.IO
   */
  private emitNotification(userId: string, data: any) {
    try {
      const { emitNotification } = require("../../socket/index");
      emitNotification(userId, data);
    } catch (error) {
      console.error("Error emitting notification:", error);
    }
  }

  /**
   * Emit notification update via Socket.IO
   */
  private emitNotificationUpdate(userId: string, data: any) {
    try {
      const { emitNotificationUpdate } = require("../../socket/index");
      emitNotificationUpdate(userId, data);
    } catch (error) {
      console.error("Error emitting notification update:", error);
    }
  }
}

export default new NotificationService();
