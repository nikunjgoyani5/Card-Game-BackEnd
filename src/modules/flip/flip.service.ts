import RoomModel from "../../models/Room.model";
import FlipHistoryModel from "../../models/FlipHistory.model";
import CriticalErrorModel from "../../models/CriticalError.model";
import TransactionModel from "../../models/Transaction.model";
import { CustomError } from "../../utils/customError.utility";
import {
  DEFAULT_TIMER_MS,
  GAME_ERROR,
  ROOM_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
} from "../../utils/constants.utility";
import { gameTimers } from "../../utils/flipTimer.utility";
import { RoundRule } from "../../utils/roundRules.utility";
import { withTransaction } from "../../utils/transaction.utility";
import redis from "../../config/redis";

interface GameState {
  roomId: string;
  status: "IN_PROGRESS" | "ENDED";
  currentFlipNumber: number;
  totalFlips: number;
  timerStartedAt: number;
  timerDuration: number;
  timerActive: boolean;
  dealerDeck: string[];
  revealedCards: string[];
  playerScores: Record<string, number>;
  playerHands: Record<string, string[]>;
  currentTurnPlayer?: string;
  roundRules: RoundRule[];
  activeFlipRequest?: {
    requesterId: string;
    bidAmount: number;
    expiresAt: number;
  };
}

class FlipService {
  /**
   * Execute a flip (triggered by player, auto-flip, or flip request)
   *
   * Complete business logic for flipping a card
   */
  async executeFlip(
    roomId: string,
    triggeredBy: "PLAYER" | "AUTO" | "REQUEST",
    playerId?: string
  ): Promise<void> {
    // 1. Set flip processing lock (prevents flip requests during execution)
    await redis.setex(`flipprocessing:${roomId}`, 3, "true");

    // 2. Stop timer
    gameTimers.stopTimer(roomId);

    // 3. Get game state from Redis
    let gameStateFromRedis = await redis.hgetall(`game:${roomId}`);

    // If not in Redis, get from MongoDB and initialize Redis
    let gameState: GameState;

    if (gameStateFromRedis && Object.keys(gameStateFromRedis).length > 0) {
      // Parse Redis data
      gameState = {
        roomId: roomId,
        status: gameStateFromRedis.status as "IN_PROGRESS" | "ENDED",
        currentFlipNumber: parseInt(
          gameStateFromRedis.currentFlipNumber || "0"
        ),
        totalFlips: parseInt(gameStateFromRedis.totalFlips || "0"),
        timerStartedAt: parseInt(gameStateFromRedis.timerStartedAt || "0"),
        timerDuration: parseInt(
          gameStateFromRedis.timerDuration || "" + DEFAULT_TIMER_MS
        ),
        timerActive: gameStateFromRedis.timerActive === "true",
        dealerDeck: JSON.parse(gameStateFromRedis.dealerDeck || "[]"),
        revealedCards: JSON.parse(gameStateFromRedis.revealedCards || "[]"),
        playerScores: JSON.parse(gameStateFromRedis.playerScores || "{}"),
        playerHands: JSON.parse(gameStateFromRedis.playerHands || "{}"),
        currentTurnPlayer: gameStateFromRedis.currentTurnPlayer,
        roundRules: JSON.parse(gameStateFromRedis.roundRules || "[]"),
      };
    } else {
      // Get from MongoDB and initialize Redis
      const room = await RoomModel.findById(roomId);
      if (!room) {
        throw new CustomError(
          `${GAME_ERROR.INVALID_ROOM_STATE}: Room not found`,
          404
        );
      }

      if (room.status !== ROOM_STATUS.IN_PROGRESS) {
        throw new CustomError(
          `${GAME_ERROR.INVALID_ROOM_STATE}: Room is not in active game state`,
          409
        );
      }

      // Get round rules from Redis
      let roundRules: RoundRule[] = [];
      const roundRulesJson = await redis.get(`roundrules:${roomId}`);
      if (roundRulesJson) {
        roundRules = JSON.parse(roundRulesJson);
      } else {
        // Generate round rules if not found
        const {
          generateRoundRules,
        } = require("../../utils/roundRules.utility");
        const baseBetAmount = room.baseBetAmount || 25;
        roundRules = generateRoundRules(room.gameLength, baseBetAmount);
        // Store in Redis for future use
        await redis.setex(
          `roundrules:${roomId}`,
          86400,
          JSON.stringify(roundRules)
        );
      }

      gameState = {
        roomId: room._id.toString(),
        status: "IN_PROGRESS",
        currentFlipNumber: 0,
        totalFlips: room.gameLength,
        timerStartedAt: Date.now(),
        timerDuration: DEFAULT_TIMER_MS,
        timerActive: true,
        dealerDeck: room.dealerDeck || [],
        revealedCards: [],
        playerScores: {},
        playerHands: Object.fromEntries(room.playerHands || new Map()),
        roundRules,
      };

      // Initialize player scores
      for (const player of room.players) {
        gameState.playerScores[player.userId.toString()] = 0;
      }

      // Store in Redis
      await redis.hset(`game:${roomId}`, {
        status: gameState.status,
        currentFlipNumber: gameState.currentFlipNumber.toString(),
        totalFlips: gameState.totalFlips.toString(),
        timerStartedAt: gameState.timerStartedAt.toString(),
        timerDuration: gameState.timerDuration.toString(),
        timerActive: gameState.timerActive.toString(),
        dealerDeck: JSON.stringify(gameState.dealerDeck),
        revealedCards: JSON.stringify(gameState.revealedCards),
        playerScores: JSON.stringify(gameState.playerScores),
        playerHands: JSON.stringify(gameState.playerHands),
        roundRules: JSON.stringify(gameState.roundRules),
      });
    }

    // Validate game state has dealer deck
    if (!gameState.dealerDeck || gameState.dealerDeck.length === 0) {
      throw new CustomError(
        `${GAME_ERROR.CARD_DISTRIBUTION}: Dealer deck not initialized`,
        500
      );
    }

    // Validate game state has player hands
    if (
      !gameState.playerHands ||
      Object.keys(gameState.playerHands).length === 0
    ) {
      throw new CustomError(
        `${GAME_ERROR.INVALID_ROOM_STATE}: Player hands not initialized`,
        500
      );
    }

    const currentFlipNumber = gameState.currentFlipNumber;
    const totalFlips = gameState.totalFlips;

    // 3. Validate flip is possible
    if (currentFlipNumber >= totalFlips) {
      throw new CustomError(
        `${GAME_ERROR.ALL_FLIPS_COMPLETED}: All flips have been completed`,
        409
      );
    }

    // 4. Get next card from dealer deck
    const dealerDeck = gameState.dealerDeck;
    if (!dealerDeck || dealerDeck.length === 0) {
      throw new CustomError(
        `${GAME_ERROR.CARD_DISTRIBUTION}: Dealer deck is empty`,
        500
      );
    }

    const revealedCard = dealerDeck[currentFlipNumber];
    if (!revealedCard) {
      throw new CustomError(
        `${GAME_ERROR.CARD_DISTRIBUTION}: No card at position ${currentFlipNumber}`,
        500
      );
    }

    // Get round rule for this flip
    const roundRules = gameState.roundRules;
    if (roundRules.length === 0) {
      throw new CustomError(
        `${GAME_ERROR.INVALID_ROOM_STATE}: Round rules not found`,
        500
      );
    }

    const currentRule = roundRules[currentFlipNumber];
    if (!currentRule) {
      throw new CustomError(
        `${GAME_ERROR.INVALID_ROOM_STATE}: No rule for flip ${
          currentFlipNumber + 1
        }`,
        500
      );
    }

    // 6. Check for matching cards among players
    const playerHands = gameState.playerHands;
    let matchedPlayer: string | null = null;

    // Validate playerHands exists and has entries
    if (!playerHands || Object.keys(playerHands).length === 0) {
      throw new CustomError(
        `${GAME_ERROR.INVALID_ROOM_STATE}: Player hands not initialized`,
        500
      );
    }

    for (const [userId, cards] of Object.entries(playerHands)) {
      if (cards && Array.isArray(cards) && cards.includes(revealedCard)) {
        matchedPlayer = userId;
        break;
      }
    }

    // CRITICAL: Every card MUST match with a player
    if (!matchedPlayer) {
      // This should NEVER happen if card distribution was correct
      console.error(
        `🚨 CRITICAL ERROR: Card ${revealedCard} not found in any player's hand!`
      );
      console.error(`Room: ${roomId}, Flip: ${currentFlipNumber + 1}`);
      console.error(`Player hands:`, playerHands);
      console.error(`Dealer deck:`, dealerDeck);

      // Log critical error to database
      await CriticalErrorModel.create({
        errorType: "CARD_NOT_FOUND",
        roomId,
        flipNumber: currentFlipNumber + 1,
        revealedCard,
        playerHands: JSON.stringify(playerHands),
        timestamp: new Date(),
      });

      throw new CustomError(
        `${GAME_ERROR.CARD_NOT_FOUND}: Critical error - revealed card not found in any player hand`,
        500
      );
    }

    // 7. Apply round rule (every flip has a matched player)
    let scoreChange = 0;
    const playerScores = gameState.playerScores;

    if (currentRule.type !== "NO_CHANGE") {
      scoreChange =
        currentRule.type === "WIN" ? currentRule.amount : -currentRule.amount;

      // Update player score
      playerScores[matchedPlayer] =
        (playerScores[matchedPlayer] || 0) + scoreChange;

      // Remove matched card from player's hand (one-time use)
      playerHands[matchedPlayer] = playerHands[matchedPlayer].filter(
        (card) => card !== revealedCard
      );

      // Update Redis
      await redis.hset(`game:${roomId}`, {
        playerScores: JSON.stringify(playerScores),
        playerHands: JSON.stringify(playerHands),
      });
    } else {
      // NO_CHANGE rule - still remove card from hand (used once)
      playerHands[matchedPlayer] = playerHands[matchedPlayer].filter(
        (card) => card !== revealedCard
      );

      // Update Redis
      await redis.hset(`game:${roomId}`, {
        playerHands: JSON.stringify(playerHands),
      });
    }

    // 8. Update flip counter and revealed cards
    const revealedCards = gameState.revealedCards;
    revealedCards.push(revealedCard);

    // Update Redis
    await redis.hset(`game:${roomId}`, {
      currentFlipNumber: (currentFlipNumber + 1).toString(),
      revealedCards: JSON.stringify(revealedCards),
    });

    // Clear flip processing lock
    await redis.del(`flipprocessing:${roomId}`);

    // Log flip in MongoDB
    await FlipHistoryModel.create({
      roomId,
      flipNumber: currentFlipNumber + 1,
      revealedCard,
      matchedPlayer,
      ruleApplied: currentRule,
      scoreChange,
      triggeredBy,
      playerId: playerId || null,
      timestamp: new Date(),
    });

    console.log(
      `✅ Flip ${
        currentFlipNumber + 1
      }/${totalFlips}: ${revealedCard} → Player ${matchedPlayer} (${
        currentRule.type
      } ${scoreChange >= 0 ? "+" : ""}${scoreChange})`
    );

    // Handle flip request payment if this was a flip request
    const activeFlipRequestData = await redis.get(`fliprequest:${roomId}`);
    if (activeFlipRequestData && triggeredBy === "PLAYER") {
      try {
        const request = JSON.parse(activeFlipRequestData);
        if (request.userId === playerId) {
          // Get room to know game mode
          const room = await RoomModel.findById(roomId);
          if (room) {
            // Transfer flip request payment to platform (atomic transaction)
            await withTransaction(async (session) => {
              // Log platform fee transaction
              await TransactionModel.create(
                [
                  {
                    userId: request.userId,
                    roomId,
                    type: TRANSACTION_TYPE.FLIP_REQUEST_PLATFORM_FEE,
                    amount: request.bidAmount,
                    walletType: room.gameMode,
                    status: TRANSACTION_STATUS.COMPLETED,
                    description: `Platform fee for flip request in room ${roomId}`,
                  },
                ],
                { session }
              );
            });

            console.log(
              `💰 Platform received $${request.bidAmount} from flip request by ${request.username}`
            );
          }

          // Clear flip request from Redis
          await redis.del(`fliprequest:${roomId}`);
          console.log(
            `✅ Flip request cleared after successful flip by ${request.username}`
          );
        }
      } catch (err) {
        console.error("Error handling flip request payment:", err);
      }
    }

    // 10. Emit flip result to all players
    try {
      const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency

      // Get matched player's username from room
      const room = await RoomModel.findById(roomId).populate(
        "players.userId",
        "username"
      );
      const matchedPlayerData = room?.players.find(
        (p) => p.userId._id.toString() === matchedPlayer
      );
      const matchedPlayerUsername = matchedPlayerData
        ? (matchedPlayerData.userId as any).username
        : "Unknown";

      if (io) {
        io.to(roomId).emit("card_flipped", {
          flipNumber: currentFlipNumber + 1,
          totalFlips,
          revealedCard,
          matchedPlayer: {
            userId: matchedPlayer,
            username: matchedPlayerUsername,
            scoreChange,
          },
          rule: currentRule,
          playerScores,
          remainingCards: dealerDeck.slice(currentFlipNumber + 1),
        });
      }

      // Emit score update
      if (io) {
        io.to(roomId).emit("score_updated", {
          roomId,
          flipNumber: currentFlipNumber + 1,
          scores: playerScores,
        });
      }
    } catch (err) {
      console.error("Error emitting socket events:", err);
    }

    // 11. Check if game is complete
    if (currentFlipNumber + 1 >= totalFlips) {
      console.log(`🏁 Game complete for room ${roomId}`);
      // Validate all flips are truly complete
      if (currentFlipNumber + 1 !== totalFlips) {
        console.error(
          `⚠️ Flip count mismatch: ${currentFlipNumber + 1} vs ${totalFlips}`
        );
      }
      await this.endGame(roomId);
    } else {
      // Start timer for next flip
      gameTimers.startTimer(roomId, DEFAULT_TIMER_MS, (roomId) =>
        this.executeFlip(roomId, "AUTO")
      );

      // Emit next flip ready with turn information
      try {
        const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
        if (io) {
          io.to(roomId).emit("next_flip_ready", {
            flipNumber: currentFlipNumber + 2,
            timeLimit: DEFAULT_TIMER_MS,
          });
        }
      } catch (err) {
        console.error("Error emitting next flip ready:", err);
      }

      console.log(
        `⏱️  Next flip ready: ${currentFlipNumber + 2}/${totalFlips}`
      );
    }
  }

  /**
   * Handle player-initiated flip
   *
   * Priority logic:
   * 1. If there's an active flip request (bid) → Only the highest bidder can flip
   * 2. If no flip request → Only the player whose turn it is can flip
   */
  async playerFlip(roomId: string, playerId: string): Promise<void> {
    // Validate player is in room
    const room = await RoomModel.findById(roomId);
    if (!room) {
      throw new CustomError(
        `${GAME_ERROR.INVALID_ROOM_STATE}: Room not found`,
        404
      );
    }

    const playerInRoom = room.players.some(
      (p) => p.userId.toString() === playerId
    );
    if (!playerInRoom) {
      throw new CustomError(
        `${GAME_ERROR.INVALID_ROOM_STATE}: Player not in room`,
        403
      );
    }

    // Check if there's an active flip request (HIGHEST PRIORITY)
    const activeFlipRequestData = await redis.get(`fliprequest:${roomId}`);
    console.log("activeFlipRequestData", activeFlipRequestData);

    if (activeFlipRequestData) {
      const request = JSON.parse(activeFlipRequestData);

      // Only the player who placed the flip request (highest bidder) can execute it
      if (request.userId !== playerId) {
        throw new CustomError(
          `${GAME_ERROR.INVALID_ROOM_STATE}: Cannot flip - ${
            request.username || "Another player"
          } has won the flip rights with a higher bid`,
          403
        );
      }

      // Flip request overrides turn - this player won the bid
      console.log(
        `✅ Player ${playerId} executing flip via flip request (bid winner)`
      );
      await this.executeFlip(roomId, "PLAYER", playerId);
      return;
    }

    // No flip request - validate it's player's turn (TURN-BASED LOGIC)
    const gameStateData = await redis.hgetall(`game:${roomId}`);
    if (gameStateData && gameStateData.currentTurnPlayer) {
      if (gameStateData.currentTurnPlayer !== playerId) {
        throw new CustomError(
          `${GAME_ERROR.INVALID_ROOM_STATE}: Not your turn to flip`,
          403
        );
      }
    }

    // Player has turn rights - execute flip
    console.log(`✅ Player ${playerId} executing flip on their turn`);
    await this.executeFlip(roomId, "PLAYER", playerId);
  }

  /**
   * End game and calculate final results
   *
   * Feature 8: Settlement & Platform Fees
   * - Calculates final standings (winner to loser)
   * - Applies 5% platform fee to winners only
   * - Unlocks entry fees
   * - Settles all wallet balances atomically
   * - Logs all transactions
   * - Transitions room to ENDED
   */
  private async endGame(roomId: string): Promise<void> {
    const GameResultModel = require("../../models/GameResult.model").default;
    const UserModel = require("../../models/User.model").default;
    const TransactionModel = require("../../models/Transaction.model").default;
    const { withTransaction } = require("../../utils/transaction.utility");
    const {
      TRANSACTION_TYPE,
      TRANSACTION_STATUS,
    } = require("../../utils/constants.utility");

    console.log(`🏁 Starting settlement for room ${roomId}`);

    // Stop timer first
    gameTimers.stopTimer(roomId);

    await withTransaction(async (session) => {
      // 1. Get room and validate
      const room = await RoomModel.findById(roomId)
        .populate("players.userId", "username")
        .session(session);

      if (!room) {
        throw new CustomError("Room not found", 404);
      }

      if (room.status === ROOM_STATUS.ENDED) {
        console.log(`⚠️  Room ${roomId} already settled`);
        return; // Already settled
      }

      // Validate room has players
      if (!room.players || room.players.length === 0) {
        throw new CustomError("Cannot settle game with no players", 400);
      }

      // Validate essential room data
      if (room.entryFee === undefined || room.entryFee < 0) {
        throw new CustomError("Invalid entry fee in room data", 400);
      }

      // 2. Get final scores from flip history
      const flipHistory = await FlipHistoryModel.find({ roomId })
        .sort({ flipNumber: 1 })
        .session(session);

      // Calculate scores from history
      const playerScores: Record<string, number> = {};

      // Initialize all players
      for (const player of room.players) {
        const userId = player.userId._id.toString();
        playerScores[userId] = 0;
      }

      // Apply flip history
      for (const flip of flipHistory) {
        const matchedPlayerId = flip.matchedPlayer.toString();
        if (playerScores[matchedPlayerId] !== undefined) {
          playerScores[matchedPlayerId] += flip.scoreChange;
        }
      }

      // 3. Calculate final standings
      interface PlayerStanding {
        userId: string;
        username: string;
        rank: number;
        entryFee: number;
        score: number;
        finalPot: number;
        platformFee: number;
        playerReceives: number;
        netChange: number;
      }

      const standings: PlayerStanding[] = [];

      for (const player of room.players) {
        const userId = player.userId._id.toString();
        const username = (player.userId as any).username;
        const score = playerScores[userId] || 0;

        // Calculate final pot
        const finalPot = room.entryFee + score;
        const winnings = finalPot - room.entryFee;

        // Apply 5% platform fee to winners only
        let platformFee = 0;
        let playerReceives = finalPot;

        if (winnings > 0) {
          // Fix floating-point precision: round to 2 decimal places
          platformFee = Math.round(winnings * 0.05 * 100) / 100;
          playerReceives = Math.round((finalPot - platformFee) * 100) / 100;
        }

        standings.push({
          userId,
          username,
          rank: 0, // Will be assigned after sorting
          entryFee: room.entryFee,
          score,
          finalPot,
          platformFee,
          playerReceives,
          netChange: playerReceives - room.entryFee,
        });
      }

      // Sort: highest to lowest by playerReceives
      standings.sort((a, b) => b.playerReceives - a.playerReceives);

      // Assign ranks
      standings.forEach((standing, index) => {
        standing.rank = index + 1;
      });

      console.log(`💰 Settlement standings:`, standings);

      // 4. Settle each player's wallet
      for (const standing of standings) {
        const user = await UserModel.findById(standing.userId).session(session);

        if (!user) {
          console.error(
            `⚠️  User ${standing.userId} not found during settlement`
          );
          // Log critical error for tracking
          await CriticalErrorModel.create(
            [
              {
                errorType: "USER_NOT_FOUND_SETTLEMENT",
                roomId,
                metadata: { userId: standing.userId },
                timestamp: new Date(),
              },
            ],
            { session }
          );
          continue;
        }

        // Validate wallet exists
        if (!user.wallet) {
          throw new CustomError(`User ${standing.userId} has no wallet`, 500);
        }

        // Round values to prevent floating-point precision errors
        const entryFeeToUnlock = Math.round(room.entryFee * 100) / 100;
        const amountToAdd = Math.round(standing.playerReceives * 100) / 100;

        // Unlock entry fee and settle balance
        if (room.gameMode === "FREE_COIN") {
          // Validate locked amount before unlock
          if (user.wallet.coinLocked < entryFeeToUnlock) {
            console.error(
              `⚠️  User ${standing.userId} has insufficient locked coins: ${user.wallet.coinLocked} < ${entryFeeToUnlock}`
            );
          }
          // Unlock entry fee
          user.wallet.coinLocked = Math.max(
            0,
            Math.round((user.wallet.coinLocked - entryFeeToUnlock) * 100) / 100
          );
          // Add final receives amount
          user.wallet.coinBalance =
            Math.round((user.wallet.coinBalance + amountToAdd) * 100) / 100;
        } else {
          // Validate locked amount before unlock
          if (user.wallet.realMoneyLocked < entryFeeToUnlock) {
            console.error(
              `⚠️  User ${standing.userId} has insufficient locked money: ${user.wallet.realMoneyLocked} < ${entryFeeToUnlock}`
            );
          }
          // Unlock entry fee
          user.wallet.realMoneyLocked = Math.max(
            0,
            Math.round((user.wallet.realMoneyLocked - entryFeeToUnlock) * 100) /
              100
          );
          // Add final receives amount
          user.wallet.realMoneyBalance =
            Math.round((user.wallet.realMoneyBalance + amountToAdd) * 100) /
            100;
        }

        user.wallet.version += 1;
        user.wallet.lastUpdated = new Date();
        await user.save({ session });

        console.log(
          `💸 Settled ${standing.username}: Score ${standing.score}, Net ${standing.netChange}, Fee ${standing.platformFee}`
        );

        // 5. Log transactions
        // Transaction 1: Unlock entry fee
        await TransactionModel.create(
          [
            {
              userId: standing.userId,
              roomId,
              type: TRANSACTION_TYPE.ENTRY_FEE_UNLOCK,
              amount: room.entryFee,
              walletType: room.gameMode,
              status: TRANSACTION_STATUS.COMPLETED,
              metadata: { rank: standing.rank, score: standing.score },
            },
          ],
          { session }
        );

        // Transaction 2: Game result (win/loss)
        if (standing.score !== 0) {
          await TransactionModel.create(
            [
              {
                userId: standing.userId,
                roomId,
                type:
                  standing.score > 0
                    ? TRANSACTION_TYPE.GAME_WIN
                    : TRANSACTION_TYPE.GAME_LOSS,
                amount: standing.score,
                walletType: room.gameMode,
                status: TRANSACTION_STATUS.COMPLETED,
                metadata: { rank: standing.rank, finalPot: standing.finalPot },
              },
            ],
            { session }
          );
        }

        // Transaction 3: Platform fee (if applicable)
        if (standing.platformFee > 0) {
          await TransactionModel.create(
            [
              {
                userId: standing.userId,
                roomId,
                type: TRANSACTION_TYPE.PLATFORM_FEE,
                amount: -standing.platformFee,
                walletType: room.gameMode,
                status: TRANSACTION_STATUS.COMPLETED,
                metadata: {
                  winnings: standing.finalPot - room.entryFee,
                  feeRate: 0.05,
                },
              },
            ],
            { session }
          );
        }
      }

      // 6. Update room status
      room.status = ROOM_STATUS.ENDED;
      room.endDate = new Date();
      await room.save({ session });

      // 7. Store final results
      const totalPlatformFees = standings.reduce(
        (sum, s) => sum + s.platformFee,
        0
      );

      const gameEndedAt = new Date();
      const gameStartedAt = room.startedAt || new Date(Date.now() - 3600000); // Fallback to 1 hour ago
      const gameDuration = Math.floor(
        (gameEndedAt.getTime() - gameStartedAt.getTime()) / 1000
      ); // seconds

      await GameResultModel.create(
        [
          {
            roomId: room._id,
            gameMode: room.gameMode,
            gameLength: room.gameLength,
            maxPlayers: room.maxPlayers,
            entryFee: room.entryFee,
            maxWinningAmount: room.maxWinningAmount,
            baseBetAmount: room.baseBetAmount,
            betMultiplier: room.betMultiplier,
            totalPlatformFees,
            standings: standings.map((s) => ({
              userId: s.userId,
              username: s.username,
              rank: s.rank,
              entryFee: s.entryFee,
              score: s.score,
              finalPot: s.finalPot,
              platformFee: s.platformFee,
              playerReceives: s.playerReceives,
              netChange: s.netChange,
            })),
            startedAt: gameStartedAt,
            endedAt: gameEndedAt,
            duration: gameDuration,
          },
        ],
        { session }
      );

      console.log(
        `✅ Game ${roomId} settled. Total platform fees: $${totalPlatformFees.toFixed(
          2
        )}`
      );

      // 8. Emit game ended event
      try {
        const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
        if (io) {
          io.to(roomId).emit("game_ended", {
            roomId,
            standings: standings.map((s) => ({
              userId: s.userId,
              username: s.username,
              rank: s.rank,
              score: s.score,
              netChange: s.netChange,
              platformFee: s.platformFee,
            })),
            completedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Error emitting game ended event:", err);
      }

      // 9. TODO: Cleanup Redis
      await redis.del(`game:${roomId}`);
      await redis.del(`fliprequest:${roomId}`);
    });

    // CRITICAL: Run fraud detection on game completion
    try {
      const { detectCollusion } = require("../../utils/fraud.utility");
      await detectCollusion(roomId);
    } catch (error) {
      console.error("Fraud detection error:", error);
      // Don't fail settlement on fraud detection error
    }

    console.log(`🎉 Settlement complete for room ${roomId}`);
  }

  /**
   * Get flip history for a room
   */
  async getFlipHistory(roomId: string): Promise<any[]> {
    const history = await FlipHistoryModel.find({ roomId })
      .sort({ flipNumber: 1 })
      .populate("matchedPlayer", "username")
      .populate("playerId", "username")
      .lean();

    return history;
  }

  /**
   * Get current flip status
   */
  async getFlipStatus(roomId: string): Promise<any> {
    // Get from Redis
    const gameStateData = await redis.hgetall(`game:${roomId}`);

    let currentFlipNumber = 0;
    let totalFlips = 0;
    let status = ROOM_STATUS.WAITING;

    if (gameStateData && Object.keys(gameStateData).length > 0) {
      currentFlipNumber = parseInt(gameStateData.currentFlipNumber || "0");
      totalFlips = parseInt(gameStateData.totalFlips || "0");
      status = (gameStateData.status as any) || ROOM_STATUS.IN_PROGRESS;
    } else {
      // Fallback to MongoDB if not in Redis
      const room = await RoomModel.findById(roomId);
      if (room) {
        status = room.status;
        totalFlips = room.gameLength;
      }
    }

    return {
      roomId,
      status,
      currentFlipNumber,
      totalFlips,
      timerActive: gameTimers.hasTimer(roomId),
    };
  }
}

export default new FlipService();
