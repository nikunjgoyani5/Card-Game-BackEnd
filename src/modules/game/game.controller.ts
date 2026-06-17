// src/modules/game/game.controller.ts

import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success, fail } from "../../utils/apiResponse.utility";
import gameService from "./game.service";

/**
 * Starts a game for a room
 *
 * Endpoint: POST /api/v1/game/start/:roomId
 *
 * Request:
 * - Params: roomId (MongoDB ObjectId)
 * - User: From JWT token (must be room host)
 *
 * Response:
 * - room: Updated room object with game state
 * - cardsPerPlayer: Number of cards each player receives
 *
 * @route POST /api/v1/game/start/:roomId
 * @access Private (Authenticated users only)
 */
export const startGame = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const userId = req?.user?._id;

  const result = await gameService.startGame(roomId, userId);

  return success(res, "Game started successfully", result);
});

/**
 * Gets current game state (for debugging)
 *
 * Endpoint: GET /api/v1/game/:roomId/state
 *
 * @route GET /api/v1/game/:roomId/state
 * @access Private (Authenticated users only)
 */
export const getGameState = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const state = await gameService.getGameState(roomId);

  return success(res, "Game state retrieved successfully", state);
});

/**
 * Gets player's cards (for testing/debugging)
 *
 * Endpoint: GET /api/v1/game/:roomId/cards
 *
 * @route GET /api/v1/game/:roomId/cards
 * @access Private (Authenticated users only)
 */
export const getPlayerCards = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const userId = req?.user?._id;

  const cards = await gameService.getPlayerCards(roomId, userId);

  return success(res, "Player cards retrieved successfully", cards);
});

/**
 * Gets current game scores
 *
 * Endpoint: GET /api/v1/game/:roomId/scores
 *
 * @route GET /api/v1/game/:roomId/scores
 * @access Private (Authenticated users only)
 */
export const getGameScores = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const scores = await gameService.getGameScores(roomId);

  return success(res, "Game scores retrieved successfully", scores);
});
