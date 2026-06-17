import mongoose from "mongoose";
import Room from "../../models/Room.model";
import UserModel from "../../models/User.model";
import GameResult from "../../models/GameResult.model";
import Transaction from "../../models/Transaction.model";
import PaymentTransaction from "../../models/PaymentTransaction.model";
import WithdrawalRequest from "../../models/WithdrawalRequest.model";
import AdminAuditLog from "../../models/AdminAuditLog.model";
import { CustomError } from "../../utils/customError.utility";

import KYCVerification from "../../models/KYCVerification.model";
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from "../../utils/constants.utility";

const { ObjectId } = mongoose.Types;

class AdminService {
  /**
   * Log admin action
   */
  private async logAdminAction(
    adminId: string,
    action: string,
    category: string,
    description: string,
    details: any,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await AdminAuditLog.create({
        adminId: new ObjectId(adminId),
        adminUsername: details.adminUsername || "Unknown",
        adminRole: details.adminRole || "ADMIN",
        action,
        category,
        description,
        targetUserId: details.targetUserId
          ? new ObjectId(details.targetUserId)
          : undefined,
        targetUsername: details.targetUsername,
        targetRoomId: details.targetRoomId
          ? new ObjectId(details.targetRoomId)
          : undefined,
        targetTransactionId: details.targetTransactionId
          ? new ObjectId(details.targetTransactionId)
          : undefined,
        oldValue: details.oldValue,
        newValue: details.newValue,
        reason: details.reason,
        ipAddress,
        userAgent,
        status: "SUCCESS",
        metadata: details.metadata,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error logging admin action:", error);
    }
  }

  /**
   * Get active games
   */
  async getActiveGames(
    limit: number,
    offset: number
  ): Promise<{ games: any[]; total: number }> {
    try {
      const rooms = await Room.find({
        status: { $in: ["WAITING", "IN_PROGRESS"] },
      })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();

      const total = await Room.countDocuments({
        status: { $in: ["WAITING", "IN_PROGRESS"] },
      });

      const games = rooms.map((room: any) => ({
        roomId: room.roomId,
        gameMode: room.gameMode,
        gameLength: room.gameLength,
        currentFlip: room.currentFlip || 0,
        players: room.players?.length || 0,
        totalPot: room.totalPot || 0,
        status: room.status,
        startedAt: room.startedAt || room.createdAt,
      }));

      return { games, total };
    } catch (error: any) {
      console.error("Error fetching active games:", error);
      throw error;
    }
  }

  /**
   * Ban player
   */
  async banPlayer(
    userId: string,
    reason: string,
    duration: string,
    banType: string,
    adminId: string,
    adminUsername: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<any> {
    try {
      // Find user
      const user = await UserModel.findById(userId);
      if (!user) {
        const error: any = new Error("User not found");
        error.statusCode = 404;
        error.errorCode = "USER_NOT_FOUND";
        throw error;
      }

      const oldStatus = user.accountStatus;

      // Calculate ban expiry
      let bannedUntil: Date | null = null;
      if (duration === "7_DAYS") {
        bannedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (duration === "30_DAYS") {
        bannedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      // Update user status
      user.accountStatus = "BANNED";
      user.bannedUntil = bannedUntil || undefined;
      await user.save();

      // If player is in active game, handle game
      const activeRoom = await Room.findOne({
        "players.userId": new ObjectId(userId),
        status: { $in: ["WAITING", "IN_PROGRESS"] },
      });

      if (activeRoom) {
        // If game in progress, force refund all players
        if (activeRoom.status === "IN_PROGRESS" && activeRoom.entryFee > 0) {
          for (const player of activeRoom.players) {
            // Refund entry fee
            const playerUser = await UserModel.findById(player.userId);
            if (playerUser) {
              if (activeRoom.gameMode === "REAL_MONEY") {
                playerUser.wallet.realMoneyBalance += activeRoom.entryFee;
              } else {
                playerUser.wallet.coinBalance += activeRoom.entryFee;
              }
              await playerUser.save();

              // Log transaction
              await Transaction.create({
                userId: player.userId,
                type: "REFUND",
                amount: activeRoom.entryFee,
                walletType: activeRoom.gameMode,
                status: "completed",
                metadata: {
                  reason: "Game cancelled due to player ban",
                  roomId: activeRoom.roomId,
                  adminId,
                },
              });
            }
          }
        }

        // Mark room as completed (no CANCELLED status in enum)
        activeRoom.status = "CANCELLED" as any;
        await activeRoom.save();
      }

      const result = {
        userId,
        username: user.username,
        bannedUntil: bannedUntil ? bannedUntil.toISOString() : "PERMANENT",
        banType,
        reason,
        oldStatus,
        gameRefunded: !!activeRoom,
      };

      // Log admin action
      await this.logAdminAction(
        adminId,
        "USER_BAN",
        "USER_MANAGEMENT",
        `Banned user ${result.username}`,
        {
          adminUsername,
          targetUserId: userId,
          targetUsername: result.username,
          reason,
          oldValue: { accountStatus: result.oldStatus },
          newValue: {
            accountStatus: "BANNED",
            bannedUntil: result.bannedUntil,
            banType,
          },
        },
        ipAddress,
        userAgent
      );

      // Emit socket event to user
      try {
        const { io, onlineUsers } = require("../../socket/index");
        const userSocketId = onlineUsers.get(userId);
        if (userSocketId) {
          io.to(userSocketId).emit("account_banned", {
            reason,
            bannedUntil: result.bannedUntil,
            banType,
          });
        }
      } catch (socketError) {
        console.error("Error emitting ban event:", socketError);
      }

      return result;
    } catch (error: any) {
      console.error("Error banning player:", error);
      throw error;
    }
  }

  /**
   * Unban player
   */
  async unbanPlayer(
    userId: string,
    adminId: string,
    adminUsername: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<any> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        const error: any = new Error("User not found");
        error.statusCode = 404;
        error.errorCode = "USER_NOT_FOUND";
        throw error;
      }

      const oldStatus = user.accountStatus;
      user.accountStatus = "ACTIVE";
      user.bannedUntil = undefined;
      await user.save();

      // Log admin action
      await this.logAdminAction(
        adminId,
        "USER_UNBAN",
        "USER_MANAGEMENT",
        `Unbanned user ${user.username}`,
        {
          adminUsername,
          targetUserId: userId,
          targetUsername: user.username,
          oldValue: { accountStatus: oldStatus },
          newValue: { accountStatus: "ACTIVE" },
        },
        ipAddress,
        userAgent
      );

      // Emit socket event
      try {
        const { io, onlineUsers } = require("../../socket/index");
        const userSocketId = onlineUsers.get(userId);
        if (userSocketId) {
          io.to(userSocketId).emit("account_unbanned", {
            timestamp: new Date(),
          });
        }
      } catch (socketError) {
        console.error("Error emitting unban event:", socketError);
      }

      return {
        userId,
        username: user.username,
        newStatus: "ACTIVE",
      };
    } catch (error: any) {
      console.error("Error unbanning player:", error);
      throw error;
    }
  }

  /**
   * Issue refund to player
   */
  async issueRefund(
    userId: string,
    amount: number,
    gameMode: string,
    reason: string,
    roomId: string | undefined,
    transactionId: string | undefined,
    adminId: string,
    adminUsername: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<any> {
    try {
      // Find user
      const user = await UserModel.findById(userId);
      if (!user) {
        const error: any = new Error("User not found");
        error.statusCode = 404;
        error.errorCode = "USER_NOT_FOUND";
        throw error;
      }

      // Credit wallet
      const oldBalance =
        gameMode === "REAL_MONEY"
          ? user.wallet.realMoneyBalance
          : user.wallet.coinBalance;

      if (gameMode === "REAL_MONEY") {
        user.wallet.realMoneyBalance =
          Math.round((user.wallet.realMoneyBalance + amount) * 100) / 100;
      } else {
        user.wallet.coinBalance =
          Math.round((user.wallet.coinBalance + amount) * 100) / 100;
      }

      user.wallet.version += 1;
      user.wallet.lastUpdated = new Date();
      await user.save();

      const newBalance =
        gameMode === "REAL_MONEY"
          ? user.wallet.realMoneyBalance
          : user.wallet.coinBalance;

      // Create transaction log
      const transaction = await Transaction.create({
        userId: new ObjectId(userId),
        type: TRANSACTION_TYPE.REFUNDED,
        amount,
        walletType: gameMode,
        status: TRANSACTION_STATUS.COMPLETED,
        metadata: {
          reason,
          roomId,
          transactionId: transactionId || 0,
          issuedBy: adminId,
          issuedAt: new Date(),
        },
      });

      const result = {
        refundId: transaction._id.toString(),
        userId,
        username: user.username,
        amount,
        gameMode,
        oldBalance,
        newBalance,
      };

      // Log admin action
      await this.logAdminAction(
        adminId,
        "REFUND_ISSUE",
        "WALLET_OPERATIONS",
        `Issued refund of ${amount} to ${result.username}`,
        {
          adminUsername,
          targetUserId: userId,
          targetUsername: result.username,
          targetRoomId: roomId,
          targetTransactionId: transactionId || 0,
          reason,
          oldValue: { balance: result.oldBalance },
          newValue: { balance: result.newBalance },
          metadata: { amount, gameMode },
        },
        ipAddress,
        userAgent
      );

      // Send notification to user
      try {
        const notificationService =
          require("../notification/notification.service").default;
        await notificationService.sendNotification(userId, {
          type: "SYSTEM_ANNOUNCEMENT",
          title: "Refund Issued",
          message: `You have received a refund of ${amount} ${
            gameMode === "REAL_MONEY" ? "dollars" : "coins"
          }. Reason: ${reason}`,
          data: {
            amount,
            gameMode,
            refundId: result.refundId,
          },
          priority: "HIGH",
        });
      } catch (notificationError) {
        console.error("Error sending refund notification:", notificationError);
      }

      return result;
    } catch (error: any) {
      console.error("Error issuing refund:", error);
      throw error;
    }
  }

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(period: string): Promise<any> {
    try {
      // Calculate date range
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case "24h":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Get user statistics
      const totalUsers = await UserModel.countDocuments();
      const newSignups = await UserModel.countDocuments({
        createdAt: { $gte: startDate },
      });
      const activeUsers = await UserModel.countDocuments({
        updatedAt: { $gte: startDate },
        accountStatus: "ACTIVE",
      });

      // Get game statistics
      const activeGames = await Room.countDocuments({
        status: { $in: ["WAITING", "IN_PROGRESS"] },
      });

      const completedGames = await GameResult.countDocuments({
        endedAt: { $gte: startDate },
        status: "COMPLETED",
      });

      // Calculate average game duration
      const gameDurations = await GameResult.aggregate([
        {
          $match: {
            endedAt: { $gte: startDate },
            status: "COMPLETED",
          },
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: "$duration" },
          },
        },
      ]);

      const avgGameDuration =
        gameDurations.length > 0
          ? Math.round(gameDurations[0].avgDuration / 60) + "min"
          : "0min";

      // Get financial statistics
      const deposits = await PaymentTransaction.aggregate([
        {
          $match: {
            status: "COMPLETED",
            completedAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const withdrawals = await WithdrawalRequest.aggregate([
        {
          $match: {
            status: "COMPLETED",
            completedAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const platformFees = await GameResult.aggregate([
        {
          $match: {
            endedAt: { $gte: startDate },
            status: "COMPLETED",
            gameMode: "REAL_MONEY",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPlatformFees" },
          },
        },
      ]);

      const totalDeposits =
        deposits.length > 0 ? Math.round(deposits[0].total * 100) / 100 : 0;
      const totalWithdrawals =
        withdrawals.length > 0
          ? Math.round(withdrawals[0].total * 100) / 100
          : 0;
      const totalPlatformFees =
        platformFees.length > 0
          ? Math.round(platformFees[0].total * 100) / 100
          : 0;
      const netRevenue = totalDeposits - totalWithdrawals;
      const revenue = totalPlatformFees + (totalDeposits - totalWithdrawals);

      return {
        overview: {
          totalUsers,
          activeUsers,
          totalGames: completedGames,
          revenue: Math.round(revenue * 100) / 100,
        },
        gameStats: {
          activeGames,
          completedGames,
          averageGameDuration: avgGameDuration,
        },
        financials: {
          totalDeposits,
          totalWithdrawals,
          platformFees: totalPlatformFees,
          netRevenue: Math.round(netRevenue * 100) / 100,
        },
        userActivity: {
          newSignups,
          activeNow: 0, // Would need Redis or socket tracking
          peakConcurrent: 0, // Would need time-series data
        },
      };
    } catch (error: any) {
      console.error("Error fetching dashboard analytics:", error);
      throw error;
    }
  }

  /**
   * Search players
   */
  async searchPlayers(
    query: string | undefined,
    status: string | undefined,
    limit: number,
    offset: number
  ): Promise<{ players: any[]; total: number }> {
    try {
      const filter: any = {};

      if (query) {
        filter.$or = [
          { username: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
          { userId: { $regex: query, $options: "i" } },
        ];
      }

      if (status) {
        filter.accountStatus = status;
      }

      const players = await UserModel.find(filter)
        .select(
          "userId username email accountStatus wallet.realMoneyBalance wallet.coinBalance createdAt"
        )
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();

      const total = await UserModel.countDocuments(filter);

      return {
        players: players.map((p: any) => ({
          userId: p.userId || p._id.toString(),
          username: p.username,
          email: p.email,
          accountStatus: p.accountStatus,
          realMoneyBalance: p.wallet?.realMoneyBalance || 0,
          coinBalance: p.wallet?.coinBalance || 0,
          joinedDate: p.createdAt,
        })),
        total,
      };
    } catch (error: any) {
      console.error("Error searching players:", error);
      throw error;
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(
    adminId: string | undefined,
    action: string | undefined,
    startDate: Date | undefined,
    endDate: Date | undefined,
    limit: number,
    offset: number
  ): Promise<{ logs: any[]; total: number }> {
    try {
      const filter: any = {};

      if (adminId) {
        filter.adminId = new ObjectId(adminId);
      }

      if (action) {
        filter.action = action;
      }

      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = startDate;
        if (endDate) filter.timestamp.$lte = endDate;
      }

      const logs = await AdminAuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean();

      const total = await AdminAuditLog.countDocuments(filter);

      return { logs, total };
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      throw error;
    }
  }

  /**
   * Get KYC submissions
   */
  async getKYCSubmissions(
    status: string | undefined,
    level: string | undefined,
    limit: number,
    offset: number
  ): Promise<{ submissions: any[]; total: number }> {
    try {
      const filter: any = {};

      if (status) {
        filter.status = status;
      }

      if (level) {
        filter.level = level;
      }

      const submissions = await KYCVerification.find(filter)
        .populate("userId", "username email phoneNumber")
        .populate("reviewedBy", "username")
        .sort({ submittedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();

      const total = await KYCVerification.countDocuments(filter);

      return { submissions, total };
    } catch (error: any) {
      console.error("Error fetching KYC submissions:", error);
      throw error;
    }
  }

  /**
   * Approve KYC submission
   */
  async approveKYC(
    kycId: string,
    level: string,
    notes: string | undefined,
    adminId: string,
    adminUsername: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<any> {
    try {
      const kyc = await KYCVerification.findById(kycId);
      if (!kyc) {
        throw new CustomError("KYC submission not found", 404);
      }

      const user = await UserModel.findById(kyc.userId);
      if (!user) {
        throw new CustomError("User not found", 404);
      }

      const oldStatus = kyc.status;
      const oldLevel = kyc.level;

      // Update KYC status
      kyc.status = "APPROVED";
      kyc.level = (level as any) || kyc.level;
      kyc.approvedAt = new Date();
      kyc.reviewedAt = new Date();
      // kyc.reviewedBy = new ObjectId(adminId);
      if (notes) {
        kyc.notes = notes;
      }
      await kyc.save();

      const result = {
        kycId: kyc._id.toString(),
        userId: user._id.toString(),
        username: user.username,
        level,
        oldStatus,
        oldLevel,
        dailyWithdrawalLimit: kyc.dailyWithdrawalLimit,
        monthlyWithdrawalLimit: kyc.monthlyWithdrawalLimit,
        lifetimeWithdrawalLimit: kyc.lifetimeWithdrawalLimit,
      };

      // Log admin action
      await this.logAdminAction(
        adminId,
        "KYC_APPROVE",
        "KYC_MANAGEMENT",
        `Approved KYC for ${user.username} at level ${level}`,
        {
          adminUsername,
          targetUserId: user._id.toString(),
          targetUsername: user.username,
          oldValue: { status: oldStatus, level: oldLevel },
          newValue: { status: "APPROVED", level },
          metadata: { notes },
        },
        ipAddress,
        userAgent
      );

      // Send notification to user
      try {
        const Notification = (await import("../../models/Notification.model"))
          .default;
        await Notification.create({
          userId: user._id,
          type: "KYC_APPROVED",
          title: "KYC Verification Approved",
          message: `Your KYC verification has been approved at ${level} level. You can now withdraw funds.`,
          category: "ACCOUNT",
          priority: "HIGH",
        });
      } catch (notificationError) {
        console.error(
          "Error sending KYC approval notification:",
          notificationError
        );
      }

      return result;
    } catch (error: any) {
      console.error("Error approving KYC:", error);
      throw error;
    }
  }

  /**
   * Reject KYC submission
   */
  async rejectKYC(
    kycId: string,
    reason: string,
    notes: string | undefined,
    adminId: string,
    adminUsername: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<any> {
    try {
      const kyc = await KYCVerification.findById(kycId);
      if (!kyc) {
        throw new CustomError("KYC submission not found", 404);
      }

      const user = await UserModel.findById(kyc.userId);
      if (!user) {
        throw new CustomError("User not found", 404);
      }

      const oldStatus = kyc.status;

      // Update KYC status
      kyc.status = "REJECTED";
      kyc.rejectedAt = new Date();
      kyc.rejectionReason = reason;
      kyc.reviewedAt = new Date();
      // kyc.reviewedBy = new ObjectId(adminId);
      if (notes) {
        kyc.notes = notes;
      }
      await kyc.save();

      const result = {
        kycId: kyc._id.toString(),
        userId: user._id.toString(),
        username: user.username,
        rejectionReason: reason,
        oldStatus,
      };

      // Log admin action
      await this.logAdminAction(
        adminId,
        "KYC_REJECT",
        "KYC_MANAGEMENT",
        `Rejected KYC for ${user.username}`,
        {
          adminUsername,
          targetUserId: user._id.toString(),
          targetUsername: user.username,
          reason,
          oldValue: { status: oldStatus },
          newValue: { status: "REJECTED" },
          metadata: { notes },
        },
        ipAddress,
        userAgent
      );

      // Send notification to user
      try {
        const Notification = (await import("../../models/Notification.model"))
          .default;
        await Notification.create({
          userId: user._id,
          type: "KYC_REJECTED",
          title: "KYC Verification Rejected",
          message: `Your KYC verification has been rejected. Reason: ${reason}`,
          category: "ACCOUNT",
          priority: "HIGH",
        });
      } catch (notificationError) {
        console.error(
          "Error sending KYC rejection notification:",
          notificationError
        );
      }

      return result;
    } catch (error: any) {
      console.error("Error rejecting KYC:", error);
      throw error;
    }
  }
}

export default new AdminService();
