import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success, fail } from "../../utils/apiResponse.utility";
import leaderboardService from "./leaderboard.service";
import statsService from "./stats.service";

class LeaderboardController {
  /**
   * GET /api/v1/leaderboard/global
   * Get global leaderboard
   */
  getGlobalLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    const {
      gameMode = "REAL_MONEY",
      period = "WEEKLY",
      limit = 100,
      offset = 0,
    } = req.query;
    const userId = (req as any).user?._id;

    const leaderboard = await leaderboardService.getGlobalLeaderboard(
      gameMode as string,
      period as string,
      parseInt(limit as string),
      parseInt(offset as string),
      userId
    );

    return success(
      res,
      leaderboard,
      "Global leaderboard retrieved successfully"
    );
  });

  /**
   * GET /api/v1/leaderboard/friends
   * Get friends-only leaderboard
   */
  getFriendsLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    const {
      gameMode = "REAL_MONEY",
      period = "ALL_TIME",
      limit = 100,
      offset = 0,
    } = req.query;
    const userId = (req as any).user?._id;

    const leaderboard = await leaderboardService.getFriendsLeaderboard(
      userId,
      gameMode as string,
      period as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    return success(
      res,
      leaderboard,
      "Friends leaderboard retrieved successfully"
    );
  });

  /**
   * GET /api/v1/stats/player/:userId
   * Get detailed player statistics
   */
  getPlayerStats = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const requesterId = (req as any).user?._id;

    const stats = await statsService.getPlayerStats(userId, requesterId);

    return success(res, stats, "Player statistics retrieved successfully");
  });

  /**
   * POST /api/v1/leaderboard/refresh (Admin only)
   * Manually trigger leaderboard refresh
   */
  refreshLeaderboards = asyncHandler(async (req: Request, res: Response) => {
    await leaderboardService.updateAllLeaderboards();

    return success(res, "Leaderboards refreshed successfully");
  });
}

export default new LeaderboardController();
