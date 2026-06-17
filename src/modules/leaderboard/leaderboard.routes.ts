import { Router } from "express";
import leaderboardController from "./leaderboard.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { role } from "../../middlewares/role.middleware";
import {
  validate,
  validateParams,
} from "../../middlewares/validation.middleware";
import {
  getGlobalLeaderboardSchema,
  getFriendsLeaderboardSchema,
  getPlayerStatsSchema,
} from "./leaderboard.validation";
import { USER_TYPE } from "../../utils/constants.utility";

const router = Router();

/**
 * GET /api/v1/leaderboard/global
 * Get global leaderboard (public, but shows user rank if authenticated)
 */
router.get(
  "/global",
  validate(getGlobalLeaderboardSchema),
  leaderboardController.getGlobalLeaderboard
);

/**
 * GET /api/v1/leaderboard/friends
 * Get friends-only leaderboard (requires authentication)
 */
router.get(
  "/friends",
  authMiddleware,
  validate(getFriendsLeaderboardSchema),
  leaderboardController.getFriendsLeaderboard
);

/**
 * GET /api/v1/stats/player/:userId
 * Get detailed player statistics (public)
 */
router.get(
  "/stats/player/:userId",
  validateParams(getPlayerStatsSchema),
  leaderboardController.getPlayerStats
);

/**
 * POST /api/v1/leaderboard/refresh
 * Manually refresh leaderboards (admin only)
 */
router.post(
  "/refresh",
  authMiddleware,
  role([USER_TYPE.ADMIN]),
  leaderboardController.refreshLeaderboards
);

export default router;
