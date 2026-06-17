// src/modules/game/game.service.ts

import mongoose from "mongoose";
import RoomModel from "../../models/Room.model";
import UserModel from "../../models/User.model";
import { CustomError } from "../../utils/customError.utility";
import {
  withTransaction,
  sessionOptions,
} from "../../utils/transaction.utility";
import {
  ROOM_ERROR,
  GAME_ERROR,
  ROOM_STATUS,
  DEFAULT_TIMER_MS,
} from "../../utils/constants.utility";
import {
  createStandardDeck,
  shuffleDeck,
  selectSubset,
  distributeCardsToUsers,
  Card,
} from "../../utils/card.utility";
import redis from "../../config/redis";

/**
 * Game Service
 *
 * Handles game setup and card distribution:
 * - Starting games with validation
 * - Deck creation and shuffling
 * - Card distribution to players
 * - Game state initialization in Redis
 * - Socket.IO event emissions
 */
class GameService {
  /**
   * Starts a game for a given room
   *
   * Complete Flow:
   * 1. Validate room exists and is in WAITING status
   * 2. Validate minimum player count (2 players)
   * 3. Validate requester is room host (for manual start)
   * 4. Create and shuffle standard 52-card deck
   * 5. Select subset based on gameLength (26 or 52 cards)
   * 6. Distribute cards evenly to all players
   * 7. Store dealer deck in MongoDB (single source of truth)
   * 8. Initialize game state in Redis (fast access)
   * 9. Update room status to IN_PROGRESS
   * 10. Emit Socket.IO events (game_starting, cards_distributed, initial_state)
   *
   * @param roomId - Room ID to start game for
   * @param userId - User ID requesting game start (must be host unless auto-start)
   * @param isAutoStart - Whether this is an automatic start (bypasses host check)
   * @returns Updated room with game state
   *
   * @throws ROOM_005 if room not found
   * @throws ROOM_008 if game already started
   * @throws ROOM_013 if not enough players
   * @throws GAME_004 if user is not room host (manual start only)
   * @throws GAME_002 if shuffle fails
   * @throws GAME_001 if card distribution fails
   */
  async startGame(
    roomId: string,
    userId: string,
    isAutoStart: boolean = false
  ) {
    return await withTransaction(async (session) => {
      // ==================== VALIDATION ====================

      // 1. Get room with session
      const room = await RoomModel.findById(roomId).session(session);

      if (!room) {
        throw new CustomError(
          `${ROOM_ERROR.ROOM_NOT_FOUND}: Room not found`,
          404
        );
      }

      // 2. Check room status
      if (room.status !== ROOM_STATUS.WAITING) {
        throw new CustomError(
          `${ROOM_ERROR.ALREADY_STARTED}: Game already in progress or ended`,
          409
        );
      }

      // 3. Check minimum player count
      if (room.currentPlayers < 2) {
        throw new CustomError(
          `${ROOM_ERROR.NOT_ENOUGH_PLAYERS}: Minimum 2 players required to start`,
          400
        );
      }

      // 4. Verify requester is room host (for manual start only)
      // Note: Auto-start when room full bypasses this check
      if (!isAutoStart && room.ownerId.toString() != userId) {
        throw new CustomError(
          `${GAME_ERROR.NOT_ROOM_HOST}: Only room host can manually start the game`,
          403
        );
      }

      // 5. Get player user IDs for card distribution
      const playerUserIds = room.players.map((p) => p.userId.toString());

      // 6. Get player details for socket events
      const players = await UserModel.find({
        _id: { $in: playerUserIds },
      })
        .select("_id username")
        .session(session);

      // ==================== DECK CREATION & SHUFFLING ====================

      try {
        // 7. Create standard 52-card deck
        const fullDeck = createStandardDeck();

        // 8. Shuffle using Fisher-Yates algorithm
        const shuffledDeck = shuffleDeck(fullDeck);

        // 9. Select subset based on gameLength
        let gameDeck: Card[];
        if (room.gameLength === 52) {
          gameDeck = shuffledDeck; // Use all 52 cards
        } else if (room.gameLength === 26) {
          gameDeck = selectSubset(shuffledDeck, 26); // Random 26 cards
        } else {
          throw new CustomError(
            `${ROOM_ERROR.INVALID_GAME_LENGTH}: Invalid game length: ${room.gameLength}`,
            400
          );
        }

        // 10. Convert to card codes (string array)
        const dealerDeck = gameDeck.map((card) => card.code);

        // ==================== CARD DISTRIBUTION ====================

        // 11. Distribute cards to players
        const cardsPerPlayer = room.gameLength / room.maxPlayers;

        // Validate even distribution
        if (room.gameLength % room.maxPlayers !== 0) {
          throw new CustomError(
            `${GAME_ERROR.CARD_DISTRIBUTION}: Cannot distribute ${room.gameLength} cards evenly among ${room.maxPlayers} players`,
            500
          );
        }

        // Distribute cards using utility function
        const playerHands = distributeCardsToUsers(dealerDeck, playerUserIds);

        // 12. Store dealer deck (single source of truth)
        room.dealerDeck = dealerDeck;

        // 13. Store player hands (Map<userId, cardCodes[]>)
        room.playerHands = playerHands;

        // ==================== UPDATE ROOM STATE ====================

        // 14. Update room status
        room.status = ROOM_STATUS.IN_PROGRESS;
        room.startedAt = new Date();

        // 15. Save room to MongoDB
        await room.save(sessionOptions(session));

        // ==================== REDIS GAME STATE ====================

        // ==================== ROUND RULES GENERATION ====================
        // Generate round rules for the game
        const {
          generateRoundRules,
        } = require("../../utils/roundRules.utility");
        const roundRules = generateRoundRules(
          room.gameLength,
          room.baseBetAmount
        );

        console.log(`✅ Generated ${roundRules.length} round rules for game`);

        // Initialize player scores (all start at 0)
        const playerScores: Record<string, number> = {};
        for (const playerId of playerUserIds) {
          playerScores[playerId] = 0;
        }

        // Initialize game state in Redis for fast access
        await redis.hset(`game:${roomId}`, {
          status: "IN_PROGRESS",
          currentFlipNumber: "0",
          totalFlips: room.gameLength.toString(),
          dealerDeck: JSON.stringify(dealerDeck),
          playerHands: JSON.stringify(Object.fromEntries(playerHands)),
          playerScores: JSON.stringify(playerScores),
          roundRules: JSON.stringify(roundRules),
          revealedCards: JSON.stringify([]),
          timerStartedAt: Date.now().toString(),
          timerDuration: "" + DEFAULT_TIMER_MS,
          timerActive: "false",
          startedAt: new Date().toISOString(),
          gameLength: room.gameLength.toString(),
          maxPlayers: room.maxPlayers.toString(),
          cardsPerPlayer: cardsPerPlayer.toString(),
        });

        // Set expiration (24 hours)
        await redis.expire(`game:${roomId}`, 86400);

        // Also store round rules separately for quick access
        await redis.setex(
          `roundrules:${roomId}`,
          86400,
          JSON.stringify(roundRules)
        );

        // ==================== SOCKET EVENTS ====================

        // Emit game_starting event (3-second countdown)
        try {
          const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
          if (io) {
            io.to(roomId).emit("game_starting", {
              roomId,
              startingIn: 3,
              players: players.map((p) => ({
                userId: p._id.toString(),
                username: p.username,
              })),
              gameLength: room.gameLength,
              maxPlayers: room.maxPlayers,
            });
          }
        } catch (err) {
          console.error("Error emitting game_starting:", err);
        }

        // Wait 3 seconds before distributing cards
        await new Promise((resolve) => setTimeout(resolve, DEFAULT_TIMER_MS));

        // Emit cards_distributed event to each player (private)
        try {
          const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
          if (io) {
            for (const player of players) {
              const playerId = player._id.toString();
              const cards = playerHands.get(playerId);

              io.to(playerId).emit("cards_distributed", {
                roomId,
                yourCards: cards,
                totalCards: cardsPerPlayer,
              });
            }
          }
        } catch (err) {
          console.error("Error emitting cards_distributed:", err);
        }

        // Emit initial_state event (public game state)
        try {
          const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
          if (io) {
            io.to(roomId).emit("initial_state", {
              roomId,
              gameLength: room.gameLength,
              currentFlip: 0,
              players: players.map((p) => ({
                userId: p._id.toString(),
                username: p.username,
                cardCount: cardsPerPlayer,
              })),
              status: "IN_PROGRESS",
              startedAt: room.startedAt,
            });
          }
        } catch (err) {
          console.error("Error emitting initial_state:", err);
        }

        // ==================== START FLIP SYSTEM ====================
        // Start the flip timer (first flip after 3 seconds)
        const { gameTimers } = require("../../utils/flipTimer.utility");
        const flipService = require("../flip/flip.service").default;

        console.log(`⏱️  Starting flip timer for room ${roomId}`);
        gameTimers.startTimer(
          roomId,
          DEFAULT_TIMER_MS,
          async (roomId: string) => {
            await flipService.executeFlip(roomId, "AUTO");
          }
        );

        // Emit first flip ready
        try {
          const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
          if (io) {
            io.to(roomId).emit("next_flip_ready", {
              flipNumber: 1,
              timeLimit: DEFAULT_TIMER_MS,
            });
          }
        } catch (err) {
          console.error("Error emitting next_flip_ready:", err);
        }

        // Return updated room
        return {
          room: {
            _id: room._id,
            code: room.code,
            roomType: room.roomType,
            gameMode: room.gameMode,
            gameLength: room.gameLength,
            maxPlayers: room.maxPlayers,
            currentPlayers: room.currentPlayers,
            betMultiplier: room.betMultiplier,
            entryFee: room.entryFee,
            maxWinningAmount: room.maxWinningAmount,
            status: room.status,
            startedAt: room.startedAt,
            players: players.map((p, index) => ({
              userId: p._id.toString(),
              username: p.username,
              seat: room.players[index].seat,
              ready: room.players[index].ready,
              cardCount: cardsPerPlayer,
            })),
          },
          cardsPerPlayer,
        };
      } catch (error: any) {
        // Handle shuffle/distribution errors
        if (
          error.message.includes("shuffle") ||
          error.message.includes("random")
        ) {
          throw new CustomError(
            `${GAME_ERROR.SHUFFLE_ERROR}: Error shuffling deck. Please try again.`,
            500
          );
        }
        throw error;
      }
    });
  }

  /**
   * Auto-starts game when room reaches max players
   *
   * Called automatically when last player joins room
   *
   * @param roomId - Room ID to auto-start
   */
  async autoStartGame(roomId: string) {
    try {
      const room = await RoomModel.findById(roomId);

      if (!room) {
        throw new CustomError(
          `${ROOM_ERROR.ROOM_NOT_FOUND}: Room not found`,
          404
        );
      }

      // Check if room is full
      if (room.currentPlayers !== room.maxPlayers) {
        throw new CustomError("Room not full yet", 400);
      }

      // Check if game already started
      if (room.status !== ROOM_STATUS.WAITING) {
        throw new CustomError("Game already started", 409);
      }

      // Use room owner as userId for auto-start
      const hostId = room.ownerId.toString();

      // Emit countdown event
      try {
        const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
        if (io) {
          io.to(roomId).emit("game_auto_starting", {
            roomId,
            startingIn: 3,
            reason: "Room full",
          });
        }
      } catch (err) {
        console.error("Error emitting game_auto_starting:", err);
      }

      // Wait 3 seconds before starting
      await new Promise((resolve) => setTimeout(resolve, DEFAULT_TIMER_MS));

      // Start game with auto-start flag
      return await this.startGame(roomId, hostId, true);
    } catch (error) {
      console.error(`Auto-start failed for room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Gets current game state
   *
   * @param roomId - Room ID
   * @returns Game state with player hands (for debugging)
   */
  async getGameState(roomId: string) {
    const room = await RoomModel.findById(roomId).populate(
      "players.userId",
      "username"
    );

    if (!room) {
      throw new CustomError(
        `${ROOM_ERROR.ROOM_NOT_FOUND}: Room not found`,
        404
      );
    }

    if (room.status !== ROOM_STATUS.IN_PROGRESS) {
      throw new CustomError(
        `${GAME_ERROR.INVALID_ROOM_STATE}: Game not in progress`,
        400
      );
    }

    return {
      roomId: room._id,
      gameLength: room.gameLength,
      maxPlayers: room.maxPlayers,
      status: room.status,
      dealerDeck: room.dealerDeck,
      playerHands: room.playerHands ? Object.fromEntries(room.playerHands) : {},
      startedAt: room.startedAt,
    };
  }

  /**
   * Gets player's cards (for testing)
   * Returns only remaining cards (used cards are removed)
   *
   * @param roomId - Room ID
   * @param userId - User ID
   * @returns Player's remaining cards
   */
  async getPlayerCards(roomId: string, userId: string) {
    const room = await RoomModel.findById(roomId);

    if (!room) {
      throw new CustomError(
        `${ROOM_ERROR.ROOM_NOT_FOUND}: Room not found`,
        404
      );
    }

    // Try to get cards from Redis first (shows remaining cards after flips)
    const gameState = await redis.hgetall(`game:${roomId}`);

    if (gameState && gameState.playerHands) {
      const playerHands = JSON.parse(gameState.playerHands);
      const cards = playerHands[userId];

      if (!cards) {
        throw new CustomError("Player not in this game", 404);
      }

      return {
        roomId: room._id,
        userId,
        cards,
        cardCount: cards.length,
      };
    }

    // Fallback to MongoDB if Redis data not available
    if (!room.playerHands) {
      throw new CustomError("Cards not distributed yet", 400);
    }

    const cards = room.playerHands.get(userId);

    if (!cards) {
      throw new CustomError("Player not in this game", 404);
    }

    return {
      roomId: room._id,
      userId,
      cards,
      cardCount: cards.length,
    };
  }

  /**
   * Gets current game scores
   *
   * @param roomId - Room ID
   * @returns Current flip number, total flips, and player scores
   */
  async getGameScores(roomId: string) {
    const room = await RoomModel.findById(roomId).populate(
      "players.userId",
      "username"
    );

    if (!room) {
      throw new CustomError(
        `${ROOM_ERROR.ROOM_NOT_FOUND}: Room not found`,
        404
      );
    }

    if (room.status !== ROOM_STATUS.IN_PROGRESS) {
      throw new CustomError(
        `${GAME_ERROR.INVALID_ROOM_STATE}: Game not in progress`,
        400
      );
    }

    // Get current flip number and scores from Redis
    const gameState = await redis.hgetall(`game:${roomId}`);

    let currentFlip = 0;
    let playerScores: Record<string, number> = {};
    let playerCardsRemaining: Record<string, number> = {};

    if (gameState && Object.keys(gameState).length > 0) {
      // Use Redis data
      currentFlip = parseInt(gameState.currentFlipNumber || "0");
      playerScores = JSON.parse(gameState.playerScores || "{}");
      const playerHands = JSON.parse(gameState.playerHands || "{}");

      // Calculate remaining cards from hands
      for (const [userId, cards] of Object.entries(playerHands) as [
        string,
        string[]
      ][]) {
        playerCardsRemaining[userId] = cards.length;
      }
    } else {
      // Fallback to FlipHistory (calculate scores from history)
      const FlipHistoryModel =
        require("../../models/FlipHistory.model").default;
      const flipHistory = await FlipHistoryModel.find({ roomId })
        .sort({ flipNumber: 1 })
        .lean();

      // Initialize scores and card counts
      if (room.playerHands) {
        for (const [userId, cards] of room.playerHands.entries()) {
          playerScores[userId] = 0;
          playerCardsRemaining[userId] = cards.length;
        }
      }

      // Apply flip history
      for (const flip of flipHistory) {
        currentFlip = flip.flipNumber;
        const matchedPlayerId = flip.matchedPlayer.toString();
        if (playerScores[matchedPlayerId] !== undefined) {
          playerScores[matchedPlayerId] += flip.scoreChange;
          playerCardsRemaining[matchedPlayerId] -= 1;
        }
      }
    }

    // Build response with player details
    const scores = room.players.map((player) => {
      const userId = player.userId._id.toString();
      const username = (player.userId as any).username;
      return {
        userId,
        username,
        score: playerScores[userId] || 0,
        cardsRemaining: playerCardsRemaining[userId] || 0,
      };
    });

    return {
      roomId: room._id,
      currentFlip,
      totalFlips: room.gameLength,
      scores,
    };
  }
}

export default new GameService();
