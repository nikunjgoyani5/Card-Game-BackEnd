// src/modules/game/game.routes.ts

import { Router } from "express";
import * as Game from "./game.controller";
import * as FlipRequest from "./flipRequest.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  validateParams,
  validate,
} from "../../middlewares/validation.middleware";
import { roomIdParamSchema } from "./game.validation";
import { flipRequestSchema } from "./flipRequest.validation";

const router = Router();

/**
 * Start game
 *
 * POST /api/v1/game/start/:roomId
 *
 * Starts the game for a room. Only room host can manually start.
 * Auto-starts when room reaches max players.
 */
router.post(
  "/start/:roomId",
  authMiddleware,
  validateParams(roomIdParamSchema),
  Game.startGame
);

/**
 * Get game state (for debugging)
 *
 * GET /api/v1/game/:roomId/state
 */
router.get(
  "/:roomId/state",
  authMiddleware,
  validateParams(roomIdParamSchema),
  Game.getGameState
);

/**
 * Get player's cards (for testing/debugging)
 *
 * GET /api/v1/game/:roomId/cards
 */
router.get(
  "/:roomId/cards",
  authMiddleware,
  validateParams(roomIdParamSchema),
  Game.getPlayerCards
);

/**
 * Request flip out of turn (bidding system)
 *
 * POST /api/v1/game/flip-request
 */
router.post(
  "/flip-request",
  authMiddleware,
  validate(flipRequestSchema),
  FlipRequest.requestFlip
);

/**
 * Get active flip request for a room
 *
 * GET /api/v1/game/flip-request/:roomId
 */
router.get(
  "/flip-request/:roomId",
  authMiddleware,
  validateParams(roomIdParamSchema),
  FlipRequest.getActiveFlipRequest
);

/**
 * Get current game scores
 *
 * GET /api/v1/game/:roomId/scores
 */
router.get(
  "/:roomId/scores",
  authMiddleware,
  validateParams(roomIdParamSchema),
  Game.getGameScores
);

export default router;
