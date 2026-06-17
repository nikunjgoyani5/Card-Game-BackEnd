/**
 * Disconnection & Bot Replacement Utility
 *
 * Handles player disconnections during active games:
 * - Grace period: 1 minute to reconnect
 * - Auto-flip: If their turn, auto-flip after 3 seconds
 * - Bot replacement: After 1 minute, bot takes over permanently
 * - No re-entry: Once replaced by bot, player cannot return
 */

import mongoose from "mongoose";
import RoomModel from "../models/Room.model";
import { DEFAULT_TIMER_MS, GAME_ERROR, ROOM_STATUS } from "./constants.utility";
import redis from "../config/redis";
interface PlayerStatus {
  status: "ACTIVE" | "DISCONNECTED" | "BOT_REPLACED";
  disconnectedAt?: number;
  replacedBy?: string;
  replacedAt?: number;
}

interface BotConfig {
  roomId: string;
  replacedPlayer: string;
  entryFeeAmount: number;
  botWalletBalance: number;
  createdAt: number;
}

/**
 * Handle player disconnection
 *
 * Flow:
 * 1. Mark player as disconnected in Redis
 * 2. Emit player_disconnected event
 * 3. Auto-flip if it's their turn (after 3 seconds)
 * 4. Schedule bot replacement (after 1 minute)
 */
export async function handlePlayerDisconnect(
  userId: string,
  roomId: string
): Promise<void> {
  console.log(`🔌 Player disconnected: ${userId} from room ${roomId}`);

  // Validation
  if (!userId || !roomId) {
    console.error("❌ Invalid parameters for disconnect handler");
    return;
  }

  // 1. Get room and validate game is active
  const room = await RoomModel.findById(roomId).populate(
    "players.userId",
    "username"
  );
  if (!room || room.status !== ROOM_STATUS.IN_PROGRESS) {
    console.log("⚠️  Room not active, ignoring disconnect");
    return;
  }

  // 2. Get game state from Redis
  const gameStateStr = await redis.get(`game:${roomId}`);
  if (!gameStateStr) {
    console.log("⚠️  No game state found in Redis");
    return;
  }

  const gameState = JSON.parse(gameStateStr);
  if (gameState.status !== "IN_PROGRESS") {
    console.log("⚠️  Game not in progress, ignoring disconnect");
    return;
  }

  // 3. Mark player as disconnected in Redis
  const playerStatus: PlayerStatus = {
    status: "DISCONNECTED",
    disconnectedAt: Date.now(),
  };
  await redis.hset(`game:${roomId}:player:${userId}`, "status", "DISCONNECTED");
  await redis.hset(
    `game:${roomId}:player:${userId}`,
    "disconnectedAt",
    Date.now().toString()
  );

  // 4. Emit to other players
  const player = room.players.find((p) => p.userId.toString() === userId);

  const { io } = await import("../socket/index");
  if (io) {
    io.to(roomId).emit("player_disconnected", {
      userId,
      username: (player?.userId as any)?.username || "Unknown",
      gracePeriod: 60000,
      message: "Player disconnected. Waiting 1 minute for reconnection...",
    });
  }

  // 5. If it's their turn, auto-flip after 3 seconds
  const currentTurnPlayer = gameState.currentTurnPlayer;
  if (currentTurnPlayer === userId) {
    setTimeout(async () => {
      try {
        const stillDisconnected = await redis.hget(
          `game:${roomId}:player:${userId}`,
          "status"
        );

        if (stillDisconnected === "DISCONNECTED") {
          console.log(`⏱️  Auto-flipping for disconnected player ${userId}`);
          const flipService = require("../modules/flip/flip.service").default;
          await flipService.executeFlip(roomId, "AUTO", userId);
        }
      } catch (error) {
        console.error(`❌ Error in auto-flip: ${error}`);
      }
    }, DEFAULT_TIMER_MS);
  }

  // 6. Schedule bot replacement after 1 minute
  setTimeout(async () => {
    try {
      const playerStatus = await redis.hget(
        `game:${roomId}:player:${userId}`,
        "status"
      );

      if (playerStatus === "DISCONNECTED") {
        console.log(`🤖 Replacing disconnected player ${userId} with bot`);
        await replaceWithBot(userId, roomId);
      }
    } catch (error) {
      console.error(`❌ Error scheduling bot replacement: ${error}`);
    }
  }, 60000); // 1 minute

  console.log(`✅ Disconnect handled for ${userId}. Grace period: 60 seconds`);
}

/**
 * Handle player reconnection
 *
 * Flow:
 * 1. Check if still within grace period (not bot-replaced)
 * 2. Update status to ACTIVE
 * 3. Send current game state to player
 * 4. Notify other players
 */
export async function handlePlayerReconnect(
  userId: string,
  roomId: string
): Promise<void> {
  console.log(`🔄 Player reconnecting: ${userId} to room ${roomId}`);

  // Validation
  if (!userId || !roomId) {
    throw new Error("Invalid userId or roomId");
  }

  // 1. Check if still within grace period
  let playerStatusStr = await redis.hget(
    `game:${roomId}:player:${userId}`,
    "status"
  );

  const roomData = await RoomModel.findById(roomId);
  const isPLayerInRoom = roomData?.players.some(
    (p) => p.userId.toString() === userId
  );
  if (isPLayerInRoom && !playerStatusStr) {
    playerStatusStr = "DISCONNECTED";
  }

  if (!playerStatusStr && !isPLayerInRoom) {
    throw new Error(
      GAME_ERROR.INVALID_RECONNECTION + ": Player not found in game"
    );
  }

  if (playerStatusStr === "BOT_REPLACED") {
    throw new Error(
      GAME_ERROR.CANNOT_RECONNECT + ": Cannot reconnect - replaced by bot"
    );
  }

  if (playerStatusStr !== "DISCONNECTED") {
    throw new Error(
      GAME_ERROR.INVALID_RECONNECTION + ": Invalid reconnection attempt"
    );
  }

  // 2. Update status to ACTIVE
  await redis.hset(`game:${roomId}:player:${userId}`, "status", "ACTIVE");
  await redis.hdel(`game:${roomId}:player:${userId}`, "disconnectedAt");

  // 3. Send current game state
  const gameStateStr = await redis.get(`game:${roomId}`);
  if (!gameStateStr) {
    throw new Error("Game state not found");
  }

  const gameState = JSON.parse(gameStateStr);
  const playerHands = gameState.playerHands || {};
  const playerScores = gameState.playerScores || {};
  const revealedCards = gameState.revealedCards || [];

  const { io, onlineUsers } = await import("../socket/index");
  const userSocketId = onlineUsers.get(userId);
  if (io && userSocketId) {
    io.to(userSocketId).emit("reconnected", {
      roomId,
      currentFlip: parseInt(gameState.currentFlipNumber || "0"),
      totalFlips: parseInt(gameState.totalFlips || "0"),
      yourCards: playerHands[userId] || [],
      yourScore: playerScores[userId] || 0,
      allScores: playerScores,
      revealedCards,
      currentTurnPlayer: gameState.currentTurnPlayer,
    });
  }

  // 4. Notify others
  const room = await RoomModel.findById(roomId).populate(
    "players.userId",
    "username"
  );
  const player = room?.players.find((p) => p.userId.toString() === userId);

  if (io) {
    io.to(roomId).emit("player_reconnected", {
      userId,
      username: (player?.userId as any)?.username || "Unknown",
      message: "Player reconnected",
    });
  }

  console.log(`✅ Player ${userId} reconnected successfully`);
}

/**
 * Replace disconnected player with bot
 *
 * Flow:
 * 1. Create bot player with virtual ID
 * 2. Transfer cards and score to bot
 * 3. Mark player as BOT_REPLACED
 * 4. Update room in MongoDB
 * 5. Store bot configuration in Redis
 * 6. Emit player_replaced_by_bot event
 * 7. Initialize bot behavior
 */
export async function replaceWithBot(
  userId: string,
  roomId: string
): Promise<void> {
  console.log(`🤖 Replacing player ${userId} with bot in room ${roomId}`);

  // Validation
  if (!userId || !roomId) {
    throw new Error("Invalid userId or roomId for bot replacement");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Create bot player
    const botId = `bot_${generateBotId()}`;
    const botName = `Bot_${generateRandomName()}`;

    console.log(`🎭 Generated bot: ${botId} (${botName})`);

    // 2. Update game state in Redis
    const gameStateStr = await redis.get(`game:${roomId}`);
    if (!gameStateStr) {
      throw new Error("Game state not found in Redis");
    }

    const gameState = JSON.parse(gameStateStr);
    const playerHands = gameState.playerHands || {};
    const playerScores = gameState.playerScores || {};

    // Transfer cards and score to bot
    playerHands[botId] = playerHands[userId] || [];
    playerScores[botId] = playerScores[userId] || 0;

    delete playerHands[userId];
    delete playerScores[userId];

    // Update current turn player if it was the disconnected player
    if (gameState.currentTurnPlayer === userId) {
      gameState.currentTurnPlayer = botId;
    }

    gameState.playerHands = playerHands;
    gameState.playerScores = playerScores;

    await redis.set(`game:${roomId}`, JSON.stringify(gameState));

    // 3. Mark player as bot-replaced
    await redis.hset(
      `game:${roomId}:player:${userId}`,
      "status",
      "BOT_REPLACED"
    );
    await redis.hset(`game:${roomId}:player:${userId}`, "replacedBy", botId);
    await redis.hset(
      `game:${roomId}:player:${userId}`,
      "replacedAt",
      Date.now().toString()
    );

    // Create bot player status
    await redis.hset(`game:${roomId}:player:${botId}`, "status", "ACTIVE");

    // 4. Update room in MongoDB
    const room = await RoomModel.findById(roomId).session(session);
    if (!room) {
      throw new Error("Room not found");
    }

    const playerIndex = room.players.findIndex(
      (p) => p.userId.toString() === userId
    );

    if (playerIndex !== -1) {
      // Store original player data
      const originalPlayer = room.players[playerIndex];

      // Replace with bot
      room.players[playerIndex] = {
        userId: originalPlayer.userId, // Keep original userId reference
        socketId: `socket_${botId}`,
        seat: originalPlayer.seat,
        ready: true,
      };

      await room.save({ session });
    }

    // 5. Store bot configuration in Redis
    const botConfig: BotConfig = {
      roomId,
      replacedPlayer: userId,
      entryFeeAmount: room.entryFee || 0,
      botWalletBalance: 10000, // Virtual balance for bot decisions
      createdAt: Date.now(),
    };

    await redis.hset(`bot:${botId}`, "roomId", roomId);
    await redis.hset(`bot:${botId}`, "replacedPlayer", userId);
    await redis.hset(
      `bot:${botId}`,
      "entryFeeAmount",
      botConfig.entryFeeAmount.toString()
    );
    await redis.hset(
      `bot:${botId}`,
      "botWalletBalance",
      botConfig.botWalletBalance.toString()
    );
    await redis.hset(
      `bot:${botId}`,
      "createdAt",
      botConfig.createdAt.toString()
    );

    await session.commitTransaction();

    const { io, onlineUsers } = await import("../socket/index");
    // 6. Emit to all players
    if (io) {
      io.to(roomId).emit("player_replaced_by_bot", {
        userId,
        botId,
        botName,
        message: "Player replaced by bot due to disconnection",
      });
    }

    // 7. Initialize bot behavior
    initializeBotBehavior(botId, roomId);

    console.log(`✅ Player ${userId} replaced with bot ${botId} (${botName})`);
  } catch (error) {
    await session.abortTransaction();
    console.error(`❌ Error replacing player with bot: ${error}`);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Initialize bot behavior
 *
 * Bots automatically flip when it's their turn with 1-2 second delay
 * Bots do NOT make flip requests (no bidding)
 */
export function initializeBotBehavior(botId: string, roomId: string): void {
  console.log(`🎮 Initializing bot behavior for ${botId} in room ${roomId}`);

  // Bot listens for game state updates and automatically flips when it's their turn
  // This is a fire-and-forget operation - we set up listeners but don't await
  setImmediate(async () => {
    try {
      // Check periodically if it's bot's turn (every 2 seconds)
      const botCheckInterval = setInterval(async () => {
        try {
          const gameStateStr = await redis.get(`game:${roomId}`);
          if (!gameStateStr) {
            clearInterval(botCheckInterval);
            console.log(
              `⚠️  Game ${roomId} ended, clearing bot ${botId} interval`
            );
            return;
          }

          const gameState = JSON.parse(gameStateStr);

          // Check if game ended
          if (gameState.status === "ENDED") {
            clearInterval(botCheckInterval);
            console.log(
              `✅ Game ${roomId} ended, bot ${botId} behavior stopped`
            );
            return;
          }

          // Check if it's bot's turn
          if (gameState.currentTurnPlayer === botId) {
            console.log(`🤖 Bot ${botId} turn detected`);
            clearInterval(botCheckInterval); // Clear interval before action

            // Random delay (1-2 seconds) to simulate thinking
            const delay = 1000 + Math.random() * 1000;

            setTimeout(async () => {
              try {
                console.log(
                  `🤖 Bot ${botId} flipping card after ${Math.round(
                    delay
                  )}ms delay`
                );
                const flipService =
                  require("../modules/flip/flip.service").default;
                await flipService.executeFlip(roomId, "PLAYER", botId);

                // Restart interval after flip for next turn
                initializeBotBehavior(botId, roomId);
              } catch (error) {
                console.error(`❌ Bot ${botId} flip error: ${error}`);
                // Restart interval even after error
                initializeBotBehavior(botId, roomId);
              }
            }, delay);
          }
        } catch (error) {
          console.error(`❌ Bot ${botId} check error: ${error}`);
        }
      }, 2000); // Check every 2 seconds

      // Store interval ID for cleanup
      await redis.hset(
        `bot:${botId}`,
        "intervalId",
        botCheckInterval.toString()
      );
    } catch (error) {
      console.error(`❌ Error initializing bot ${botId} behavior: ${error}`);
    }
  });

  console.log(`✅ Bot ${botId} behavior initialized`);
}

/**
 * Check if player is a bot
 */
export function isBot(userId: string): boolean {
  return userId.startsWith("bot_");
}

/**
 * Get bot configuration from Redis
 */
export async function getBotConfig(botId: string): Promise<BotConfig | null> {
  if (!botId || !isBot(botId)) {
    console.error(`❌ Invalid botId: ${botId}`);
    return null;
  }

  try {
    const botData = await redis.hgetall(`bot:${botId}`);
    if (!botData || Object.keys(botData).length === 0) {
      return null;
    }

    return {
      roomId: botData.roomId,
      replacedPlayer: botData.replacedPlayer,
      entryFeeAmount: parseFloat(botData.entryFeeAmount || "0"),
      botWalletBalance: parseFloat(botData.botWalletBalance || "0"),
      createdAt: parseInt(botData.createdAt || "0"),
    };
  } catch (error) {
    console.error(`❌ Error getting bot config for ${botId}:`, error);
    return null;
  }
}

/**
 * Get original player ID from bot
 */
export async function getOriginalPlayer(botId: string): Promise<string | null> {
  const botConfig = await getBotConfig(botId);
  return botConfig?.replacedPlayer || null;
}

/**
 * Handle bot settlement
 *
 * Bot's winnings/losses are credited/debited to original player's wallet
 */
export async function settleBotWinnings(
  botId: string,
  netChange: number,
  platformFee: number
): Promise<void> {
  console.log(
    `💰 Settling bot ${botId} winnings: ${netChange} (fee: ${platformFee})`
  );

  const originalPlayer = await getOriginalPlayer(botId);
  if (!originalPlayer) {
    console.error(`❌ Cannot find original player for bot ${botId}`);
    throw new Error("Original player not found for bot settlement");
  }

  console.log(
    `✅ Bot ${botId} settlement will be applied to player ${originalPlayer}`
  );

  // Note: Settlement is handled in flip.service.ts endGame()
  // Bot's score/winnings are attributed to original player
}

/**
 * Generate unique bot ID
 */
function generateBotId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Generate random bot name
 */
function generateRandomName(): string {
  const adjectives = [
    "Swift",
    "Clever",
    "Lucky",
    "Wise",
    "Bold",
    "Quick",
    "Sharp",
    "Smart",
  ];
  const nouns = [
    "Fox",
    "Wolf",
    "Eagle",
    "Tiger",
    "Lion",
    "Bear",
    "Hawk",
    "Falcon",
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 100);

  return `${adjective}${noun}${number}`;
}

/**
 * Clean up bot data after game ends
 */
export async function cleanupBotData(roomId: string): Promise<void> {
  console.log(`🧹 Cleaning up bot data for room ${roomId}`);

  if (!roomId) {
    console.error("❌ Invalid roomId for cleanup");
    return;
  }

  try {
    const room = await RoomModel.findById(roomId);
    if (!room) {
      console.log(`⚠️  Room ${roomId} not found for cleanup`);
      return;
    }

    for (const player of room.players) {
      const playerId = player.userId.toString();
      if (isBot(playerId)) {
        // Delete bot configuration
        await redis.del(`bot:${playerId}`);

        // Delete player status
        await redis.del(`game:${roomId}:player:${playerId}`);

        console.log(`🗑️  Cleaned up bot ${playerId}`);
      } else {
        // Clean up disconnected player status
        await redis.del(`game:${roomId}:player:${playerId}`);
      }
    }

    console.log(`✅ Bot data cleaned up for room ${roomId}`);
  } catch (error) {
    console.error(`❌ Error cleaning up bot data for room ${roomId}:`, error);
  }
}

export default {
  handlePlayerDisconnect,
  handlePlayerReconnect,
  replaceWithBot,
  initializeBotBehavior,
  isBot,
  getBotConfig,
  getOriginalPlayer,
  settleBotWinnings,
  cleanupBotData,
};
