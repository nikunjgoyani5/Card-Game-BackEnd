import RoomModel from "../../models/Room.model";
import UserModel from "../../models/User.model";
import TransactionModel from "../../models/Transaction.model";
import { CustomError } from "../../utils/customError.utility";
import mongoose from "mongoose";
import {
  withTransaction,
  sessionOptions,
} from "../../utils/transaction.utility";
import {
  ROOM_STATUS,
  WALLET_TYPE,
  ROOM_ERROR,
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  MATCHMAKING_TIMEOUT,
  DEFAULT_TIMER_MS,
} from "../../utils/constants.utility";
import redis from "../../config/redis";
import {
  safeRedisGet,
  safeRedisSetex,
  safeRedisIncr,
  safeRedisExpire,
  safeRedisDel,
} from "../../utils/redis.utility";

interface CreateRoomData {
  roomType?: string;
  isPrivate?: boolean;
  gameLength: number;
  maxPlayers: number;
  betMultiplier: number;
  baseBetAmount?: number;
  scheduledStartTime?: string;
  deck?: number;
  stake?: number;
  walletType?: string;
}

interface JoinRoomData {
  joinMethod: "MATCHMAKING" | "ROOM_CODE" | "INVITATION";
  roomCode?: string;
  invitationToken?: string;
  gameLength?: number;
  betMultiplier?: number;
  maxPlayers?: number;
  socketId?: string;
  seat?: number;
  // Legacy fields
  code?: string;
  roomId?: string;
}

interface ScheduleRoomData {
  roomType: string;
  gameLength: number;
  maxPlayers: number;
  betMultiplier: number;
  baseBetAmount?: number;
  scheduledStartTime: string;
  inviteFriends?: string[];
}

class RoomService {
  // ==================== ROOM CREATION ====================

  async createRoom(userId: string, data: CreateRoomData) {
    const user = await UserModel.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    // Get current game mode from Redis, fallback to DB
    let gameMode = user.lastSelectedMode || WALLET_TYPE.FREE_COIN;
    const cachedMode = await safeRedisGet(`session:${userId}:currentMode`);
    if (cachedMode) {
      gameMode = cachedMode;
    }

    // Validate game parameters
    this.validateGameParameters(data.gameLength, data.maxPlayers);

    // Calculate fees
    const baseBetAmount = data.baseBetAmount || 25;
    const entryFee = this.calculateEntryFee(
      data.gameLength,
      data.betMultiplier,
      data.maxPlayers
    );
    const maxWinningAmount = baseBetAmount * data.betMultiplier;

    // Check if user already in a game
    await this.checkUserNotInGame(userId);

    // Check sufficient balance
    const requiredBalance = entryFee + 2 * maxWinningAmount;
    await this.checkSufficientBalance(userId, gameMode, requiredBalance);

    // Generate room code for private rooms
    const roomType = data.roomType || (data.isPrivate ? "PRIVATE" : "PUBLIC");
    let code: string | undefined;
    if (roomType === "PRIVATE") {
      code = await this.generateUniqueCode();
    } else {
      code = await this.generateUniqueCode(); // Generate for all rooms for legacy compatibility
    }

    // Handle scheduled start time
    let isScheduled = false;
    let scheduledStartTime: Date | undefined;
    if (data.scheduledStartTime) {
      scheduledStartTime = new Date(data.scheduledStartTime);
      if (scheduledStartTime > new Date()) {
        isScheduled = true;
        await this.checkSchedulingConflict(userId, scheduledStartTime);
      }
    }

    // Start MongoDB transaction (or execute without transaction if not replica set)
    return await withTransaction(async (session) => {
      // Lock entry fee in wallet
      await this.lockEntryFeeInWallet(
        userId,
        entryFee,
        gameMode,
        "pending_room",
        session
      );

      const { onlineUsers } = await import("../../socket/index"); // lazy load to avoid circular dependency
      const userSocketId = onlineUsers.get(userId);
      // Create room document
      const room = await RoomModel.create(
        [
          {
            code,
            roomType,
            isPrivate: roomType === "PRIVATE",
            isScheduled,
            ownerId: userId,
            gameMode,
            gameLength: data.gameLength,
            deck: data.deck || data.gameLength,
            maxPlayers: data.maxPlayers,
            baseBetAmount,
            betMultiplier: data.betMultiplier,
            maxWinningAmount,
            entryFee,
            players: [
              {
                userId,
                socketId: userSocketId || "00000000000000",
                seat: 1,
                ready: false,
              },
            ],
            currentPlayers: 1,
            walletType: gameMode, // Legacy field
            stake: data.stake || baseBetAmount, // Legacy field
            status: ROOM_STATUS.WAITING,
            scheduledStartTime,
            startDate: scheduledStartTime || new Date(),
          },
        ],
        sessionOptions(session)
      );

      // Update transaction with roomId
      await TransactionModel.updateOne(
        {
          userId,
          roomId: "pending_room",
          type: TRANSACTION_TYPE.ENTRY_FEE_LOCK,
        },
        { roomId: room[0]._id.toString() },
        sessionOptions(session)
      );

      // Store active room in Redis with 1 hour expiry
      await safeRedisSetex(
        `activeroom:${userId}`,
        3600,
        room[0]._id.toString()
      );
      await safeRedisSetex(
        `room:${room[0]._id}`,
        3600,
        JSON.stringify({
          roomId: room[0]._id.toString(),
          gameMode,
          status: "WAITING",
          players: [userId],
          createdAt: new Date().toISOString(),
        })
      );

      // Emit room_created Socket event
      try {
        const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
        if (io) {
          io.emit("room_created", {
            roomId: room[0]._id,
            gameMode,
            gameLength: data.gameLength,
            currentPlayers: 1,
            maxPlayers: data.maxPlayers,
          });
        }
      } catch (err) {
        console.error("Error emitting room_created:", err);
      }

      return await RoomModel.findById(room[0]._id)
        .populate("ownerId", "username")
        .lean();
    });
  }

  // ==================== ROOM JOINING ====================

  async joinRoom(userId: string, data: JoinRoomData) {
    const user = await UserModel.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    // Get current game mode from Redis, fallback to DB
    let gameMode = user.lastSelectedMode || WALLET_TYPE.FREE_COIN;
    try {
      const cachedMode = await redis.get(`session:${userId}:currentMode`);
      if (cachedMode) {
        gameMode = cachedMode;
      }
    } catch (error) {
      console.error("Error getting mode from Redis:", error);
    }

    // Check user not already in a game - allow leaving WAITING rooms, block IN_PROGRESS games
    await this.checkAndLeaveWaitingRoom(userId);

    // Handle different join methods
    let room;
    switch (data.joinMethod) {
      case "MATCHMAKING":
        return await this.handleMatchmaking(
          userId,
          gameMode,
          data.gameLength!,
          data.betMultiplier!,
          data.maxPlayers || 13
        );
      case "ROOM_CODE":
        room = await this.findRoomByCode(data.roomCode || data.code!);
        break;
      case "INVITATION":
        room = await this.findRoomByInvitation(data.invitationToken!);
        break;
      default:
        throw new CustomError(
          `${ROOM_ERROR.INVALID_ROOM_CODE}: Invalid join method`,
          400
        );
    }

    if (!room) {
      throw new CustomError(
        `${ROOM_ERROR.ROOM_NOT_FOUND}: Room not found`,
        404
      );
    }

    // Validate room
    await this.validateRoomForJoin(room, gameMode, userId);

    // Join the room
    return await this.executeJoinRoom(userId, room, data.socketId);
  }

  // ==================== MATCHMAKING ====================

  private async handleMatchmaking(
    userId: string,
    gameMode: string,
    gameLength: number,
    betMultiplier: number,
    maxPlayers: number
  ) {
    // Validate parameters
    this.validateGameParameters(gameLength, maxPlayers);

    // Check rate limiting in Redis (max 5 attempts per minute)
    try {
      const attemptsKey = `matchmaking:attempts:${userId}`;
      const attempts = await redis.incr(attemptsKey);
      if (attempts === 1) {
        await redis.expire(attemptsKey, 60);
      }
      if (attempts > 5) {
        throw new CustomError(
          `${ROOM_ERROR.TOO_MANY_ATTEMPTS}: Too many matchmaking attempts. Wait 1 minute.`,
          429
        );
      }
    } catch (error: any) {
      if (error.message.includes("Too many")) throw error;
      console.error("Redis rate limit check failed:", error);
    }

    // Search for matching room
    const matchingRoom = await RoomModel.findOne({
      gameMode,
      gameLength,
      betMultiplier,
      roomType: "PUBLIC",
      status: ROOM_STATUS.WAITING,
      currentPlayers: { $lt: maxPlayers },
    });

    if (matchingRoom) {
      // Found match - join existing room
      return await this.executeJoinRoom(userId, matchingRoom);
    }

    // No match - auto-create new room
    const newRoom: any = await this.createRoom(userId, {
      roomType: "PUBLIC",
      gameLength,
      betMultiplier,
      maxPlayers,
      baseBetAmount: 25,
    });

    // Start matchmaking timeout
    await this.startMatchmakingTimeout(newRoom._id.toString(), userId);

    return {
      success: true,
      status: "WAITING_FOR_PLAYERS",
      message: "Room created. Waiting for players to join...",
      timeoutIn: MATCHMAKING_TIMEOUT,
      data: {
        roomId: newRoom._id,
        gameMode: newRoom.gameMode,
        gameLength: newRoom.gameLength,
        currentPlayers: 1,
        maxPlayers: newRoom.maxPlayers,
        entryFee: newRoom.entryFee,
        maxWinningAmount: newRoom.maxWinningAmount,
      },
    };
  }

  private async startMatchmakingTimeout(roomId: string, creatorId: string) {
    // Store timeout reference in Redis
    try {
      await redis.setex(
        `matchmaking:timeout:${roomId}`,
        MATCHMAKING_TIMEOUT + 10,
        JSON.stringify({ creatorId, startedAt: Date.now() })
      );
    } catch (error) {
      console.error("Error storing matchmaking timeout in Redis:", error);
    }

    // Schedule timeout check
    setTimeout(async () => {
      await this.checkMatchmakingTimeout(roomId, creatorId);
    }, MATCHMAKING_TIMEOUT * 1000);

    // Send periodic updates via Socket.IO
    try {
      const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
      if (io) {
        setTimeout(() => {
          io.to(creatorId).emit("matchmaking_update", {
            message: "Still searching... 30 seconds remaining",
            timeRemaining: 30,
          });
        }, 30000);

        setTimeout(() => {
          io.to(creatorId).emit("matchmaking_update", {
            message: "Almost there... 10 seconds remaining",
            timeRemaining: 10,
          });
        }, 50000);
      }
    } catch (err) {
      console.error("Error emitting matchmaking updates:", err);
    }
  }

  private async checkMatchmakingTimeout(roomId: string, creatorId: string) {
    try {
      await withTransaction(async (session) => {
        const room: any = session
          ? await RoomModel.findById(roomId).session(session)
          : await RoomModel.findById(roomId);

        if (
          room &&
          room.currentPlayers === 1 &&
          room.status === ROOM_STATUS.WAITING
        ) {
          // No one joined - cancel room
          room.status = ROOM_STATUS.CANCELLED;
          room.endedAt = new Date();
          await room.save(sessionOptions(session));

          // Unlock creator's entry fee
          await this.unlockEntryFeeInWallet(
            creatorId,
            room.entryFee,
            room.gameMode,
            roomId,
            session
          );

          // Create refund transaction
          await TransactionModel.create(
            [
              {
                userId: creatorId,
                roomId,
                walletType: room.gameMode,
                type: TRANSACTION_TYPE.ENTRY_FEE_REFUND,
                amount: room.entryFee,
                status: TRANSACTION_STATUS.COMPLETED,
              },
            ],
            sessionOptions(session)
          );

          // Notify user via Socket.IO
          try {
            const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
            if (io) {
              io.to(creatorId).emit("matchmaking_failed", {
                roomId,
                reason: "No players joined within 60 seconds",
                refundAmount: room.entryFee,
                suggestion:
                  "Try different game parameters or create a private room",
              });
            }
          } catch (err) {
            console.error("Error emitting matchmaking_failed:", err);
          }

          // Clean up Redis
          try {
            await redis.del(`matchmaking:timeout:${roomId}`);
            await redis.del(`room:${roomId}`);
            await redis.del(`activeroom:${creatorId}`);
          } catch (error) {
            console.error("Error cleaning up Redis:", error);
          }
        } else if (room && room.currentPlayers > 1) {
          // Players joined - matchmaking successful!
          try {
            await redis.del(`matchmaking:timeout:${roomId}`);
          } catch (error) {
            console.error("Error deleting Redis timeout:", error);
          }
          // Notify creator
          try {
            const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
            if (io) {
              io.to(creatorId).emit("matchmaking_success", {
                roomId,
                message: "Players joined! Game will start soon...",
                currentPlayers: room.currentPlayers,
                maxPlayers: room.maxPlayers,
              });
            }
          } catch (err) {
            console.error("Error emitting matchmaking_success:", err);
          }
        }
      });
    } catch (error) {
      console.error("Matchmaking timeout check failed:", error);
    }
  }

  async onPlayerJoinedRoom(roomId: string, creatorId: string) {
    const room = await RoomModel.findById(roomId);

    if (room && room.currentPlayers >= 2) {
      // Matchmaking successful - cancel timeout
      try {
        const timeoutData = await redis.get(`matchmaking:timeout:${roomId}`);
        if (timeoutData) {
          const { creatorId } = JSON.parse(timeoutData);
          try {
            const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
            if (io) {
              io.to(creatorId).emit("matchmaking_success", {
                roomId,
                message: "Player joined! Game starting soon...",
                currentPlayers: room.currentPlayers,
                maxPlayers: room.maxPlayers,
              });
            }
          } catch (err) {
            console.error("Error emitting matchmaking_success:", err);
          }
          await redis.del(`matchmaking:timeout:${roomId}`);
        }
      } catch (error) {
        console.error("Error checking Redis timeout:", error);
      }
    }
  }

  // ==================== ROOM SCHEDULING ====================

  async scheduleRoom(userId: string, data: ScheduleRoomData) {
    const scheduledTime = new Date(data.scheduledStartTime);

    // Validate future time
    if (scheduledTime <= new Date()) {
      throw new CustomError(
        `${ROOM_ERROR.INVALID_GAME_LENGTH}: Scheduled time must be in the future`,
        400
      );
    }

    // Check for scheduling conflicts
    await this.checkSchedulingConflict(userId, scheduledTime);

    // Create scheduled room
    const room = await this.createRoom(userId, {
      ...data,
      scheduledStartTime: data.scheduledStartTime,
    });

    if (!room) {
      throw new CustomError("Failed to create scheduled room", 500);
    }

    // Send invitations to friends via Socket.IO
    if (data.inviteFriends && data.inviteFriends.length > 0) {
      try {
        const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
        if (io) {
          for (const friendId of data.inviteFriends) {
            io.to(friendId).emit("room_invitation", {
              roomId: room._id,
              from: userId,
              scheduledStartTime: data.scheduledStartTime,
              gameMode: room.gameMode,
              gameLength: room.gameLength,
              maxPlayers: room.maxPlayers,
            });
          }
          console.log(
            `Sent ${data.inviteFriends.length} invitations for room ${room._id}`
          );
        }
      } catch (error) {
        console.error("Error sending invitations:", error);
      }
    }

    // Schedule reminder notifications (5 minutes before)
    try {
      const reminderTime = scheduledTime.getTime() - 300000; // 5 minutes before
      const delay = reminderTime - Date.now();
      if (delay > 0) {
        const roomId = room._id.toString();
        setTimeout(async () => {
          const roomStillActive = await RoomModel.findById(roomId);
          if (
            roomStillActive &&
            roomStillActive.status === ROOM_STATUS.WAITING
          ) {
            const players = roomStillActive.players.map((p) =>
              p.userId.toString()
            );
            try {
              const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
              if (io) {
                for (const playerId of players) {
                  io.to(playerId).emit("game_reminder", {
                    roomId,
                    message: "Your scheduled game starts in 5 minutes!",
                    scheduledStartTime: roomStillActive.scheduledStartTime,
                  });
                }
              }
            } catch (err) {
              console.error("Error emitting game_reminder:", err);
            }
          }
        }, delay);
      }
    } catch (error) {
      console.error("Error scheduling reminders:", error);
    }

    return room;
  }

  // ==================== ROOM LISTING ====================

  async listRooms(filters: any, userId: string) {
    const matchStage: any = {
      status: ROOM_STATUS.WAITING,
      $or: [
        {
          roomType: "PUBLIC",
        },
        {
          ownerId: userId,
        },
        {
          players: userId,
        },
      ],
    };

    if (filters.gameMode) matchStage.gameMode = filters.gameMode;
    if (filters.gameLength) matchStage.gameLength = Number(filters.gameLength);
    if (filters.betMultiplier)
      matchStage.betMultiplier = Number(filters.betMultiplier);
    if (filters.maxPlayers) matchStage.maxPlayers = Number(filters.maxPlayers);

    // Legacy filters
    if (filters.walletType) matchStage.gameMode = filters.walletType;
    if (filters.deck) matchStage.deck = Number(filters.deck);
    if (filters.stake) matchStage.stake = Number(filters.stake);

    // Use aggregation to compare currentPlayers with maxPlayers
    const rooms = await RoomModel.aggregate([
      { $match: matchStage },
      {
        $match: {
          $expr: { $lt: ["$currentPlayers", "$maxPlayers"] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "ownerId",
          foreignField: "_id",
          as: "ownerData",
        },
      },
      {
        $addFields: {
          ownerId: {
            _id: { $arrayElemAt: ["$ownerData._id", 0] },
            username: { $arrayElemAt: ["$ownerData.username", 0] },
          },
        },
      },
      { $project: { ownerData: 0 } },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
    ]);

    return {
      rooms,
      total: rooms.length,
    };
  }

  async getRoomDetails(roomId: string) {
    const room = await RoomModel.findById(roomId)
      .populate("ownerId", "username")
      .populate("players.userId", "username")
      .lean();

    if (!room) {
      throw new CustomError(
        `${ROOM_ERROR.ROOM_NOT_FOUND}: Room not found`,
        404
      );
    }

    return room;
  }

  // ==================== LEGACY METHODS (kept for compatibility) ====================

  async publicRooms(data: any, userId: string) {
    return await this.listRooms(data, userId);
  }

  async getRoom(id: string) {
    return await this.getRoomDetails(id);
  }

  // ==================== HELPER METHODS ====================

  private validateGameParameters(gameLength: number, maxPlayers: number) {
    if (![26, 52].includes(gameLength)) {
      throw new CustomError(
        `${ROOM_ERROR.INVALID_GAME_LENGTH}: Game length must be 26 or 52`,
        400
      );
    }

    const validPlayers = gameLength === 26 ? [2, 13] : [2, 4, 13];
    if (!validPlayers.includes(maxPlayers)) {
      throw new CustomError(
        `${ROOM_ERROR.INVALID_MAX_PLAYERS}: Invalid max players for selected game length`,
        400
      );
    }
  }

  private calculateEntryFee(
    gameLength: number,
    betMultiplier: number,
    maxPlayers: number
  ): number {
    return (gameLength * betMultiplier) / maxPlayers;
  }

  public async checkUserNotInGame(userId: string) {
    const activeRoom = await RoomModel.findOne({
      "players.userId": userId,
      status: { $in: [ROOM_STATUS.WAITING, ROOM_STATUS.IN_PROGRESS] },
    });

    if (activeRoom) {
      throw new CustomError(
        `${ROOM_ERROR.ALREADY_IN_GAME}: Cannot create/join room while in active game`,
        409
      );
    }
  }

  // New method to handle waiting room automatically
  private async checkAndLeaveWaitingRoom(userId: string) {
    // Check if user is in a game that's IN_PROGRESS - this should block
    const inProgressRoom = await RoomModel.findOne({
      "players.userId": userId,
      status: ROOM_STATUS.IN_PROGRESS,
    });

    if (inProgressRoom) {
      throw new CustomError(
        `${ROOM_ERROR.ALREADY_IN_GAME}: Cannot create/join room while game is in progress`,
        409
      );
    }

    // Check if user is in a WAITING room - automatically leave it
    const waitingRoom = await RoomModel.findOne({
      "players.userId": userId,
      status: ROOM_STATUS.WAITING,
    });

    if (waitingRoom) {
      // Remove player from the waiting room
      await this.leaveWaitingRoom(userId, waitingRoom);
    }
  }

  private async leaveWaitingRoom(userId: string, room: any) {
    return await withTransaction(async (session) => {
      // Remove player from room
      room.players = room.players.filter(
        (p: any) => p.userId.toString() !== userId
      );
      room.currentPlayers = room.players.length;

      // If room is empty, delete it
      if (room.currentPlayers === 0) {
        await RoomModel.findByIdAndDelete(room._id).session(session);
      } else {
        // If owner left, assign new owner
        if (room.ownerId.toString() === userId && room.players.length > 0) {
          room.ownerId = room.players[0].userId;
        }
        await room.save(sessionOptions(session));
      }

      // Unlock entry fee
      await this.unlockEntryFeeInWallet(
        userId,
        room.entryFee,
        room.gameMode,
        room._id.toString(),
        session
      );

      // Create refund transaction
      await TransactionModel.create(
        [
          {
            userId,
            roomId: room._id,
            walletType: room.gameMode,
            type: TRANSACTION_TYPE.ENTRY_FEE_UNLOCK,
            amount: room.entryFee,
            status: TRANSACTION_STATUS.COMPLETED,
            description: "Left waiting room",
          },
        ],
        sessionOptions(session)
      );

      // Clear Redis cache
      await safeRedisDel(`activeroom:${userId}`);
    });
  }

  private async checkSufficientBalance(
    userId: string,
    gameMode: string,
    requiredBalance: number
  ) {
    const user = await UserModel.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    const availableBalance =
      gameMode === WALLET_TYPE.REAL_MONEY
        ? user.wallet.realMoneyBalance
        : user.wallet.coinBalance;

    if (availableBalance < requiredBalance) {
      throw new CustomError(
        `Insufficient balance. Required: ${requiredBalance}, Available: ${availableBalance}`,
        400
      );
    }
  }

  private async checkSchedulingConflict(userId: string, scheduledTime: Date) {
    const conflictingRoom = await RoomModel.findOne({
      $or: [{ ownerId: userId }, { "players.userId": userId }],
      scheduledStartTime: {
        $gte: new Date(scheduledTime.getTime() - 3600000), // 1 hour before
        $lte: new Date(scheduledTime.getTime() + 3600000), // 1 hour after
      },
      status: { $ne: ROOM_STATUS.CANCELLED },
    });

    if (conflictingRoom) {
      throw new CustomError(
        `${ROOM_ERROR.SCHEDULING_CONFLICT}: You have another game scheduled at this time`,
        409
      );
    }
  }

  private async findRoomByCode(roomCode: string) {
    const room = await RoomModel.findOne({ code: roomCode });
    return room;
  }

  private async findRoomByInvitation(token: string) {
    // Verify JWT invitation token
    try {
      const jwt = require("jsonwebtoken");
      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET || "default-secret"
      );

      if (!decoded.roomId) {
        throw new CustomError("Invalid invitation token: missing roomId", 400);
      }

      // Check if invitation hasn't expired
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        throw new CustomError("Invitation token has expired", 400);
      }

      return await RoomModel.findById(decoded.roomId);
    } catch (error: any) {
      if (
        error.message.includes("expired") ||
        error.message.includes("invalid")
      ) {
        throw error;
      }
      throw new CustomError(`Invalid invitation token: ${error.message}`, 400);
    }
  }

  private async validateRoomForJoin(
    room: any,
    gameMode: string,
    userId: string
  ) {
    if (room.status !== ROOM_STATUS.WAITING) {
      throw new CustomError(
        `${ROOM_ERROR.ALREADY_STARTED}: Game has already started`,
        409
      );
    }

    if (room.currentPlayers >= room.maxPlayers) {
      throw new CustomError(`${ROOM_ERROR.ROOM_FULL}: Room is full`, 409);
    }

    if (room.gameMode !== gameMode) {
      throw new CustomError(
        `${ROOM_ERROR.MODE_MISMATCH}: Room game mode doesn't match your selected mode`,
        400
      );
    }

    const alreadyInRoom = room.players.some(
      (p: any) => p.userId.toString() == userId
    );
    if (alreadyInRoom) {
      throw new CustomError("User already in the room", 409);
    }
  }

  private async executeJoinRoom(userId: string, room: any, socketId?: string) {
    // Calculate required balance
    const requiredBalance = room.entryFee + 2 * room.maxWinningAmount;
    await this.checkSufficientBalance(userId, room.gameMode, requiredBalance);

    // Get user details for socket event
    const user = await UserModel.findById(userId).select("username");
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    // Start MongoDB transaction (or execute without transaction if not replica set)
    return await withTransaction(async (session) => {
      // Lock entry fee
      await this.lockEntryFeeInWallet(
        userId,
        room.entryFee,
        room.gameMode,
        room._id.toString(),
        session
      );

      const { onlineUsers } = await import("../../socket/index"); // lazy load to avoid circular dependency
      const userSocketId = onlineUsers.get(userId);
      // Add player to room
      room.players.push({
        userId,
        socketId: socketId || userSocketId || "00000000000000",
        seat: room.players.length + 1,
        ready: false,
      });
      room.currentPlayers = room.players.length;
      await room.save(sessionOptions(session));

      // Update Redis room state
      try {
        await redis.setex(
          `room:${room._id}`,
          3600,
          JSON.stringify({
            roomId: room._id.toString(),
            gameMode: room.gameMode,
            status: room.status,
            currentPlayers: room.currentPlayers,
            maxPlayers: room.maxPlayers,
            players: room.players
              .filter((p) => p && p.userId)
              .map((p) => p.userId.toString()),
          })
        );

        // Mark player as in active room
        await redis.setex(`activeroom:${userId}`, 3600, room._id.toString());
      } catch (error) {
        console.error("Error updating Redis room state:", error);
      }

      // Check if room is full
      if (room.currentPlayers === room.maxPlayers) {
        // Trigger game start automatically
        try {
          console.log(
            `Room ${room._id} is full. Starting game in 3 seconds...`
          );

          // Emit notification to all players
          try {
            const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
            if (io) {
              io.to(room._id.toString()).emit("game_auto_starting", {
                roomId: room._id,
                message: "Room is full! Game starting in 3 seconds...",
                countdown: 3,
              });
            }
          } catch (err) {
            console.error("Error emitting game_auto_starting:", err);
          }

          // Start game after 3 second delay
          setTimeout(async () => {
            try {
              const GameService = require("../game/game.service").default;
              await GameService.startGame(
                room._id.toString(),
                room.ownerId.toString(),
                true
              );
            } catch (error) {
              console.error("Error starting game:", error);
            }
          }, DEFAULT_TIMER_MS);
        } catch (error) {
          console.error("Error auto-starting game:", error);
        }
      }

      // Emit player_joined Socket event
      try {
        const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
        if (io) {
          io.to(room._id.toString()).emit("player_joined", {
            roomId: room._id,
            player: { userId, username: user.username, joinedAt: new Date() },
            currentPlayers: room.currentPlayers,
            maxPlayers: room.maxPlayers,
          });
        }
      } catch (err) {
        console.error("Error emitting player_joined:", err);
      }

      // Cancel matchmaking timeout if applicable
      await this.onPlayerJoinedRoom(
        room._id.toString(),
        room.ownerId.toString()
      );

      return await RoomModel.findById(room._id)
        .populate("ownerId", "username")
        .populate("players.userId", "username")
        .lean();
    });
  }

  private async lockEntryFeeInWallet(
    userId: string,
    amount: number,
    gameMode: string,
    roomId: string,
    session: mongoose.ClientSession | null
  ) {
    const user = session
      ? await UserModel.findById(userId).session(session)
      : await UserModel.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    if (gameMode === WALLET_TYPE.REAL_MONEY) {
      if (user.wallet.realMoneyBalance < amount) {
        throw new CustomError("Insufficient real money balance", 400);
      }
      user.wallet.realMoneyBalance -= amount;
      user.wallet.realMoneyLocked += amount;
    } else {
      if (user.wallet.coinBalance < amount) {
        throw new CustomError("Insufficient coin balance", 400);
      }
      user.wallet.coinBalance -= amount;
      user.wallet.coinLocked += amount;
    }

    user.wallet.version += 1;
    user.wallet.lastUpdated = new Date();
    await user.save(sessionOptions(session));

    // Log transaction
    await TransactionModel.create(
      [
        {
          userId,
          roomId,
          walletType: gameMode,
          type: TRANSACTION_TYPE.ENTRY_FEE_LOCK,
          amount,
          balanceAfter:
            gameMode === WALLET_TYPE.REAL_MONEY
              ? user.wallet.realMoneyBalance
              : user.wallet.coinBalance,
          status: TRANSACTION_STATUS.COMPLETED,
        },
      ],
      sessionOptions(session)
    );
  }

  private async unlockEntryFeeInWallet(
    userId: string,
    amount: number,
    gameMode: string,
    roomId: string,
    session: mongoose.ClientSession | null
  ) {
    const user = session
      ? await UserModel.findById(userId).session(session)
      : await UserModel.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    if (gameMode === WALLET_TYPE.REAL_MONEY) {
      user.wallet.realMoneyLocked -= amount;
      user.wallet.realMoneyBalance += amount;
    } else {
      user.wallet.coinLocked -= amount;
      user.wallet.coinBalance += amount;
    }

    user.wallet.version += 1;
    user.wallet.lastUpdated = new Date();
    await user.save(sessionOptions(session));

    // Transaction logged by caller
  }

  async generateUniqueCode(): Promise<string> {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid ambiguous chars
    let code: string;
    let isUnique = false;

    do {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existingRoom = await RoomModel.findOne({ code });
      isUnique = !existingRoom;
    } while (!isUnique);

    return code;
  }
}

export default new RoomService();
