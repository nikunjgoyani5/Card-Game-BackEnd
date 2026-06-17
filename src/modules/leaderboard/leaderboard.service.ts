import mongoose from "mongoose";
import PlayerStats from "../../models/PlayerStats.model";
import GameResult from "../../models/GameResult.model";
import UserModel from "../../models/User.model";
import Friendship from "../../models/Friendship.model";
import redis from "../../config/redis";

const { ObjectId } = mongoose.Types;

// Badge definitions
export const BADGES = {
  STREAK_5: {
    id: "STREAK_5",
    name: "5 Win Streak",
    description: "Win 5 games in a row",
  },
  STREAK_10: {
    id: "STREAK_10",
    name: "10 Win Streak",
    description: "Win 10 games in a row",
  },
  STREAK_20: {
    id: "STREAK_20",
    name: "20 Win Streak",
    description: "Win 20 games in a row",
  },
  HIGH_ROLLER: {
    id: "HIGH_ROLLER",
    name: "High Roller",
    description: "Win over $10,000 in total",
  },
  VETERAN_50: {
    id: "VETERAN_50",
    name: "Veteran",
    description: "Play 50 games",
  },
  VETERAN_100: {
    id: "VETERAN_100",
    name: "Seasoned Veteran",
    description: "Play 100 games",
  },
  VETERAN_500: {
    id: "VETERAN_500",
    name: "Elite Veteran",
    description: "Play 500 games",
  },
  LUCKY_PLAYER: {
    id: "LUCKY_PLAYER",
    name: "Lucky Player",
    description: "Win rate above 70%",
  },
  MASTER_PLAYER: {
    id: "MASTER_PLAYER",
    name: "Master Player",
    description: "Win rate above 80%",
  },
  PROFIT_KING: {
    id: "PROFIT_KING",
    name: "Profit King",
    description: "Earn over $5,000 profit",
  },
};

class LeaderboardService {
  /**
   * Get date range for a given period
   */
  private getDateRange(period: string): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);
    let start: Date;

    switch (period) {
      case "DAILY":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case "WEEKLY":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case "MONTHLY":
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case "ALL_TIME":
      default:
        start = new Date(0); // Unix epoch
        break;
    }

    return { start, end };
  }

  /**
   * Calculate and update leaderboard for a specific period and game mode
   */
  async calculateLeaderboard(period: string, gameMode: string): Promise<void> {
    try {
      console.log(`Calculating leaderboard: ${period} - ${gameMode}`);

      const dateRange = this.getDateRange(period);

      // Aggregate player stats from GameResult
      const stats = await GameResult.aggregate([
        {
          $match: {
            gameMode,
            endedAt: { $gte: dateRange.start, $lte: dateRange.end },
            status: "COMPLETED",
          },
        },
        { $unwind: "$standings" },
        {
          $group: {
            _id: "$standings.userId",
            totalGames: { $sum: 1 },
            totalWins: {
              $sum: {
                $cond: [{ $gt: ["$standings.netChange", 0] }, 1, 0],
              },
            },
            totalLosses: {
              $sum: {
                $cond: [{ $lt: ["$standings.netChange", 0] }, 1, 0],
              },
            },
            netProfit: { $sum: "$standings.netChange" },
          },
        },
        {
          $project: {
            userId: "$_id",
            totalGames: 1,
            totalWins: 1,
            totalLosses: 1,
            netProfit: 1,
            winRate: {
              $multiply: [{ $divide: ["$totalWins", "$totalGames"] }, 100],
            },
          },
        },
        { $sort: { netProfit: -1 } },
        { $limit: 1000 },
      ]);

      // Store in Redis sorted set for fast access
      const leaderboardKey = `leaderboard:${period}:${gameMode}`;
      await redis.del(leaderboardKey);

      if (stats.length > 0) {
        const pipeline = redis.pipeline();

        for (let i = 0; i < stats.length; i++) {
          const entry = {
            rank: i + 1,
            userId: stats[i].userId.toString(),
            stats: {
              totalGames: stats[i].totalGames,
              totalWins: stats[i].totalWins,
              totalLosses: stats[i].totalLosses,
              netProfit: Math.round(stats[i].netProfit * 100) / 100,
              winRate: Math.round(stats[i].winRate * 100) / 100,
            },
          };

          // Use netProfit as score for sorted set
          pipeline.zadd(
            leaderboardKey,
            stats[i].netProfit,
            JSON.stringify(entry)
          );
        }

        await pipeline.exec();

        // Set expiry based on period
        const ttl =
          period === "DAILY"
            ? 86400
            : period === "WEEKLY"
            ? 604800
            : period === "MONTHLY"
            ? 2592000
            : 0;

        if (ttl > 0) {
          await redis.expire(leaderboardKey, ttl);
        }
      }

      // Also update PlayerStats collection
      await this.updatePlayerStatsCollection(
        period,
        gameMode,
        stats,
        dateRange
      );

      console.log(
        `✅ Leaderboard updated: ${period} - ${gameMode} (${stats.length} players)`
      );
    } catch (error: any) {
      console.error(`Error calculating leaderboard:`, error);
      throw error;
    }
  }

  /**
   * Update PlayerStats collection in MongoDB
   */
  private async updatePlayerStatsCollection(
    period: string,
    gameMode: string,
    stats: any[],
    dateRange: { start: Date; end: Date }
  ): Promise<void> {
    const bulkOps = stats.map((stat, index) => ({
      updateOne: {
        filter: {
          userId: new ObjectId(stat.userId),
          period,
          gameMode,
        },
        update: {
          $set: {
            totalGames: stat.totalGames,
            totalWins: stat.totalWins,
            totalLosses: stat.totalLosses,
            netProfit: stat.netProfit,
            rank: index + 1,
            periodStart: dateRange.start,
            periodEnd: dateRange.end,
            lastUpdated: new Date(),
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await PlayerStats.bulkWrite(bulkOps);
    }
  }

  /**
   * Get global leaderboard
   */
  async getGlobalLeaderboard(
    gameMode: string,
    period: string,
    limit: number,
    offset: number,
    currentUserId?: string
  ): Promise<any> {
    try {
      const leaderboardKey = `leaderboard:${period}:${gameMode}`;

      // Get leaderboard from Redis (sorted by score descending)
      const entries = await redis.zrevrange(
        leaderboardKey,
        offset,
        offset + limit - 1
      );

      // Parse entries and fetch user details
      const leaderboard = await Promise.all(
        entries.map(async (entry) => {
          const data = JSON.parse(entry);
          const user = await UserModel.findById(data.userId).select(
            "username profilePicture"
          );

          return {
            rank: data.rank,
            userId: data.userId,
            username: user?.username || "Unknown",
            profilePicture: user?.profilePicture || null,
            stats: data.stats,
          };
        })
      );

      // Get total count
      const total = await redis.zcard(leaderboardKey);

      // Get current user's rank if provided
      let yourRank: number | null = null;
      if (currentUserId) {
        const allEntries = await redis.zrevrange(leaderboardKey, 0, -1);
        const userIndex = allEntries.findIndex((entry) => {
          const data = JSON.parse(entry);
          return data.userId === currentUserId;
        });
        yourRank = userIndex >= 0 ? userIndex + 1 : null;
      }

      return {
        period,
        gameMode,
        leaderboard,
        yourRank,
        total,
      };
    } catch (error: any) {
      console.error("Error fetching global leaderboard:", error);
      throw error;
    }
  }

  /**
   * Get friends-only leaderboard
   */
  async getFriendsLeaderboard(
    userId: string,
    gameMode: string,
    period: string,
    limit: number,
    offset: number
  ): Promise<any> {
    try {
      // Get user's friends
      const friendships = await Friendship.find({
        userId: new ObjectId(userId),
        status: "ACCEPTED",
      }).select("friendId");

      const friendIds = friendships.map((f) => f.friendId.toString());
      friendIds.push(userId); // Include current user

      // Get leaderboard from Redis
      const leaderboardKey = `leaderboard:${period}:${gameMode}`;
      const allEntries = await redis.zrevrange(leaderboardKey, 0, -1);

      // Filter for friends only
      const friendsEntries = allEntries
        .map((entry) => JSON.parse(entry))
        .filter((data) => friendIds.includes(data.userId));

      // Re-rank friends
      const friendsLeaderboard = friendsEntries.map((data, index) => ({
        rank: index + 1,
        userId: data.userId,
        stats: data.stats,
      }));

      // Apply pagination
      const paginatedLeaderboard = friendsLeaderboard.slice(
        offset,
        offset + limit
      );

      // Fetch user details
      const leaderboardWithUsers = await Promise.all(
        paginatedLeaderboard.map(async (entry) => {
          const user = await UserModel.findById(entry.userId).select(
            "username profilePicture"
          );

          return {
            rank: entry.rank,
            userId: entry.userId,
            username: user?.username || "Unknown",
            profilePicture: user?.profilePicture || null,
            stats: entry.stats,
          };
        })
      );

      // Get current user's rank
      const yourRank =
        friendsLeaderboard.findIndex((entry) => entry.userId === userId) + 1 ||
        null;

      return {
        period,
        gameMode,
        leaderboard: leaderboardWithUsers,
        yourRank,
        total: friendsLeaderboard.length,
      };
    } catch (error: any) {
      console.error("Error fetching friends leaderboard:", error);
      throw error;
    }
  }

  /**
   * Update all leaderboards (called by cron job)
   */
  async updateAllLeaderboards(): Promise<void> {
    const periods = ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"];
    const modes = ["FREE_COIN", "REAL_MONEY"];

    for (const period of periods) {
      for (const mode of modes) {
        try {
          await this.calculateLeaderboard(period, mode);
        } catch (error) {
          console.error(
            `Failed to update leaderboard ${period}-${mode}:`,
            error
          );
        }
      }
    }

    console.log("✅ All leaderboards updated successfully");
  }
}

export default new LeaderboardService();
