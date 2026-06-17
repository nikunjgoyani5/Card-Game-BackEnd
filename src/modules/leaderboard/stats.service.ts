import mongoose from "mongoose";
import UserModel from "../../models/User.model";
import GameResult from "../../models/GameResult.model";
import PlayerStats from "../../models/PlayerStats.model";
import { BADGES } from "./leaderboard.service";

const { ObjectId } = mongoose.Types;

class StatsService {
  /**
   * Get detailed player statistics
   */
  async getPlayerStats(userId: string, requesterId?: string): Promise<any> {
    try {
      // Get user details
      const user = await UserModel.findById(userId).select(
        "username profilePicture createdAt"
      );

      if (!user) {
        const error: any = new Error("User not found");
        error.statusCode = 404;
        error.errorCode = "USER_NOT_FOUND";
        throw error;
      }

      // Get overall stats (all-time, both modes combined)
      const overallStats = await this.calculateOverallStats(userId);

      // Get mode-specific stats
      const modeStats = await this.calculateModeStats(userId);

      // Calculate badges
      const badges = this.calculateBadges(overallStats, modeStats);

      // Get recent games (last 10)
      const recentGames = await this.getRecentGames(userId, 10);

      return {
        userId,
        username: user.username,
        profilePicture: user.profilePicture || null,
        joinedDate: user.createdAt,
        overallStats,
        modeStats,
        badges,
        recentGames,
      };
    } catch (error: any) {
      console.error("Error fetching player stats:", error);
      throw error;
    }
  }

  /**
   * Calculate overall statistics (all modes, all time)
   */
  private async calculateOverallStats(userId: string): Promise<any> {
    const results = await GameResult.aggregate([
      {
        $match: {
          status: "COMPLETED",
          "standings.userId": new ObjectId(userId),
        },
      },
      { $unwind: "$standings" },
      {
        $match: {
          "standings.userId": new ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
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
          totalProfit: { $sum: "$standings.netChange" },
        },
      },
    ]);

    if (results.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalProfit: 0,
        bestStreak: 0,
        currentStreak: 0,
      };
    }

    const stats = results[0];
    const winRate =
      stats.totalGames > 0
        ? Math.round((stats.totalWins / stats.totalGames) * 10000) / 100
        : 0;

    // Calculate streaks
    const streaks = await this.calculateStreaks(userId);

    return {
      totalGames: stats.totalGames,
      wins: stats.totalWins,
      losses: stats.totalLosses,
      winRate,
      totalProfit: Math.round(stats.totalProfit * 100) / 100,
      bestStreak: streaks.bestStreak,
      currentStreak: streaks.currentStreak,
    };
  }

  /**
   * Calculate mode-specific statistics
   */
  private async calculateModeStats(userId: string): Promise<any> {
    const modes = ["FREE_COIN", "REAL_MONEY"];
    const modeStats: any = {};

    for (const mode of modes) {
      const results = await GameResult.aggregate([
        {
          $match: {
            gameMode: mode,
            status: "COMPLETED",
            "standings.userId": new ObjectId(userId),
          },
        },
        { $unwind: "$standings" },
        {
          $match: {
            "standings.userId": new ObjectId(userId),
          },
        },
        {
          $group: {
            _id: null,
            totalGames: { $sum: 1 },
            totalWins: {
              $sum: {
                $cond: [{ $gt: ["$standings.netChange", 0] }, 1, 0],
              },
            },
            netProfit: { $sum: "$standings.netChange" },
          },
        },
      ]);

      if (results.length > 0) {
        modeStats[mode] = {
          totalGames: results[0].totalGames,
          wins: results[0].totalWins,
          netProfit: Math.round(results[0].netProfit * 100) / 100,
        };
      } else {
        modeStats[mode] = {
          totalGames: 0,
          wins: 0,
          netProfit: 0,
        };
      }
    }

    return modeStats;
  }

  /**
   * Calculate win/loss streaks
   */
  private async calculateStreaks(
    userId: string
  ): Promise<{ currentStreak: number; bestStreak: number }> {
    // Get all games ordered by end time
    const games = await GameResult.find({
      status: "COMPLETED",
      "standings.userId": new ObjectId(userId),
    })
      .sort({ endedAt: 1 })
      .select("standings");

    let currentStreak = 0;
    let bestStreak = 0;
    let lastResult: "WIN" | "LOSS" | null = null;

    for (const game of games) {
      const playerStanding = game.standings.find(
        (s: any) => s.userId.toString() === userId
      );

      if (!playerStanding) continue;

      const result = playerStanding.netChange > 0 ? "WIN" : "LOSS";

      if (result === "WIN") {
        if (lastResult === "WIN") {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        if (lastResult === "WIN") {
          currentStreak = 0;
        }
      }

      lastResult = result;
    }

    // If last game was a loss, current streak is 0
    if (lastResult === "LOSS") {
      currentStreak = 0;
    }

    return { currentStreak, bestStreak };
  }

  /**
   * Get recent games
   */
  private async getRecentGames(userId: string, limit: number): Promise<any[]> {
    const games = await GameResult.find({
      status: "COMPLETED",
      "standings.userId": new ObjectId(userId),
    })
      .sort({ endedAt: -1 })
      .limit(limit)
      .select("roomId gameMode standings endedAt");

    return games
      .map((game) => {
        const playerStanding = game.standings.find(
          (s: any) => s.userId.toString() === userId
        );

        if (!playerStanding) {
          return null;
        }

        return {
          roomId: game.roomId,
          gameMode: game.gameMode,
          result: playerStanding.netChange > 0 ? "WIN" : "LOSS",
          profitLoss: Math.round(playerStanding.netChange * 100) / 100,
          playedAt: game.endedAt,
        };
      })
      .filter(Boolean);
  }

  /**
   * Calculate badges earned by player
   */
  private calculateBadges(overallStats: any, modeStats: any): string[] {
    const badges: string[] = [];

    // Streak badges
    if (overallStats.bestStreak >= 20) {
      badges.push(BADGES.STREAK_20.id);
    } else if (overallStats.bestStreak >= 10) {
      badges.push(BADGES.STREAK_10.id);
    } else if (overallStats.bestStreak >= 5) {
      badges.push(BADGES.STREAK_5.id);
    }

    // Veteran badges (based on total games)
    if (overallStats.totalGames >= 500) {
      badges.push(BADGES.VETERAN_500.id);
    } else if (overallStats.totalGames >= 100) {
      badges.push(BADGES.VETERAN_100.id);
    } else if (overallStats.totalGames >= 50) {
      badges.push(BADGES.VETERAN_50.id);
    }

    // Win rate badges
    if (overallStats.winRate >= 80 && overallStats.totalGames >= 20) {
      badges.push(BADGES.MASTER_PLAYER.id);
    } else if (overallStats.winRate >= 70 && overallStats.totalGames >= 20) {
      badges.push(BADGES.LUCKY_PLAYER.id);
    }

    // Profit badges (real money only)
    const realMoneyProfit = modeStats.REAL_MONEY?.netProfit || 0;
    if (realMoneyProfit >= 10000) {
      badges.push(BADGES.HIGH_ROLLER.id);
    } else if (realMoneyProfit >= 5000) {
      badges.push(BADGES.PROFIT_KING.id);
    }

    return badges;
  }

  /**
   * Update player stats after a game completes
   */
  async updatePlayerStatsAfterGame(gameResultId: string): Promise<void> {
    try {
      const gameResult = await GameResult.findById(gameResultId);
      if (!gameResult || gameResult.status !== "COMPLETED") {
        return;
      }

      const periods = ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"];

      for (const standing of gameResult.standings) {
        for (const period of periods) {
          await this.updatePlayerStatForPeriod(
            standing.userId.toString(),
            gameResult.gameMode,
            period,
            standing.netChange
          );
        }
      }
    } catch (error: any) {
      console.error("Error updating player stats after game:", error);
    }
  }

  /**
   * Update player stat for a specific period
   */
  private async updatePlayerStatForPeriod(
    userId: string,
    gameMode: string,
    period: string,
    netChange: number
  ): Promise<void> {
    const dateRange = this.getDateRange(period);
    const result = netChange > 0 ? "WIN" : "LOSS";

    const stat = await PlayerStats.findOne({
      userId: new ObjectId(userId),
      gameMode,
      period,
    });

    if (stat) {
      // Update existing stat
      stat.totalGames += 1;
      if (result === "WIN") {
        stat.totalWins += 1;
        stat.currentStreak += 1;
        stat.bestStreak = Math.max(stat.bestStreak, stat.currentStreak);
      } else {
        stat.totalLosses += 1;
        stat.currentStreak = 0;
      }
      stat.netProfit += netChange;
      stat.lastGameResult = result;
      await stat.save();
    } else {
      // Create new stat
      await PlayerStats.create({
        userId: new ObjectId(userId),
        gameMode,
        period,
        totalGames: 1,
        totalWins: result === "WIN" ? 1 : 0,
        totalLosses: result === "LOSS" ? 1 : 0,
        netProfit: netChange,
        currentStreak: result === "WIN" ? 1 : 0,
        bestStreak: result === "WIN" ? 1 : 0,
        lastGameResult: result,
        periodStart: dateRange.start,
        periodEnd: dateRange.end,
      });
    }
  }

  /**
   * Get date range for period
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
        start = new Date(0);
        break;
    }

    return { start, end };
  }
}

export default new StatsService();
