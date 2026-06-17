import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import crypto from "crypto";
import { withTransaction, sessionOptions } from "../utils/transaction.utility";
import { verifyToken } from "../utils/jwt.utility";
import RoomModel, { IRoom } from "../models/Room.model";
import {
  DEFAULT_TIMER_MS,
  ROOM_STATUS,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  WALLET_TYPE,
} from "../utils/constants.utility";
import UserModel from "../models/User.model";
import TransactionModel from "../models/Transaction.model";
import { buildDeck, seededShuffle } from "../utils/shuffle";
import { roomSchema } from "../modules/room/room.validation";
import roomService from "../modules/room/room.service";
import {
  chatMessageRecieved,
  directMessageReceived,
  disconnectUserOffline,
  friendOnlineNotification,
} from ".";

export const gameEvents = (io: Server, onlineUsers: Map<string, string>) => {
  io.use((socket, next) => {
    console.log("🔐 Game socket authentication:", socket.id);
    const token: any = socket.handshake?.headers?.token;
    console.log("headers", socket.handshake.headers, token);

    if (!token) {
      console.error("❌ Game socket auth failed: No token");
      return next(new Error("auth token required"));
    }
    let payload;
    try {
      payload = verifyToken(token);
      if (!payload) {
        throw new Error("invalid token");
      }
    } catch (err) {
      console.error("❌ Game socket auth failed: Invalid token");
      return next(new Error("invalid token"));
    }

    // attach userId to the socket
    console.log("payload?.id", payload?.id);
    (socket as any).userId = payload?.id;
    console.log(`✅ Game socket authenticated: userId=${payload?.id}`);
    // const { friendOnlineNotification } = await import(".");
    friendOnlineNotification({ socketId: socket.id, userId: payload?.id });
    next();
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId;
    onlineUsers.set(userId, socket.id);

    console.log(`🎮 Game Socket Connected → User: ${userId}`);

    // Store current room for disconnect handling
    let currentRoom: string | null = null;

    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      console.log(`❌ Game Socket Disconnected: ${userId}`);
      disconnectUserOffline(socket);
      // Handle player disconnection if in active game
      if (currentRoom) {
        try {
          const {
            handlePlayerDisconnect,
          } = require("../utils/disconnection.utility");
          await handlePlayerDisconnect(userId, currentRoom);
        } catch (error) {
          console.error(`Error handling disconnect for ${userId}:`, error);
        }
      }
    });

    /************************************************************
     * CREATE ROOM
     ************************************************************/
    socket.on("create_room", async (opts: any, cb?: Function) => {
      console.log("🏠 Create room request:", { userId, opts });
      try {
        // Parse opts if it's a string (handle client sending JSON string)
        let parsedOpts = opts;
        console.log("typeof opts", typeof opts);

        if (typeof opts === "string") {
          try {
            parsedOpts = JSON.parse(opts);
          } catch (parseError) {
            console.error("❌ Invalid JSON in opts:", parseError);
            return cb?.({ ok: false, error: "Invalid JSON format" });
          }
        }

        // Validate opts is an object
        if (!parsedOpts || typeof parsedOpts !== "object") {
          console.error("❌ opts must be an object");
          return cb && cb?.({ ok: false, error: "opts must be an object" });
        }

        const { error } = roomSchema.validate(parsedOpts);
        if (error) {
          console.error("❌ Room validation failed:", error.details[0].message);
          return cb && cb?.({ ok: false, error: error.details[0].message });
        }

        const room: any = await roomService.createRoom(userId, parsedOpts);

        socket.join(room._id.toString());
        currentRoom = room._id.toString(); // Track for disconnect handling

        // Emit room_created event to lobby
        io.emit("room_created", {
          roomId: room._id,
          gameMode: room.gameMode,
          gameLength: room.gameLength,
          currentPlayers: 1,
          maxPlayers: room.maxPlayers,
          entryFee: room.entryFee,
          maxWinningAmount: room.maxWinningAmount,
          roomType: room.roomType,
        });

        console.log(`✅ Room created: ${room._id}`);
        cb?.({ ok: true, room });
      } catch (err: any) {
        console.error("❌ Create room error:", err);
        cb?.({ ok: false, error: err?.message || "server" });
      }
    });

    /************************************************************
     * JOIN ROOM
     ************************************************************/
    socket.on(
      "join_room",
      async (
        {
          roomId,
          code,
          joinMethod,
          gameLength,
          betMultiplier,
          maxPlayers,
        }: any,
        cb?: Function
      ) => {
        console.log("🚪 Join room request:", {
          userId,
          roomId,
          code,
          joinMethod,
        });
        try {
          const result: any = await roomService.joinRoom(userId, {
            joinMethod: joinMethod || "ROOM_CODE",
            roomId,
            code,
            gameLength,
            betMultiplier,
            maxPlayers,
            socketId: socket.id,
          });

          // Check if it's a matchmaking response
          if (result.status === "WAITING_FOR_PLAYERS") {
            // Join the room socket
            socket.join(result.data.roomId.toString());
            currentRoom = result.data.roomId.toString(); // Track for disconnect handling

            // Emit matchmaking_waiting event to the player
            socket.emit("matchmaking_waiting", {
              roomId: result.data.roomId,
              status: "WAITING_FOR_PLAYERS",
              message: result.message,
              timeoutIn: result.timeoutIn,
              currentPlayers: result.data.currentPlayers,
              maxPlayers: result.data.maxPlayers,
            });

            return cb?.({ ok: true, matchmaking: true, data: result });
          }

          // Regular room join
          const room = result;
          socket.join(room._id.toString());
          currentRoom = room._id.toString(); // Track for disconnect handling

          // Emit player_joined event to all players in the room
          io.to(room._id.toString()).emit("player_joined", {
            roomId: room._id,
            player: {
              userId,
              username:
                (
                  room.players.find(
                    (p: any) => p.userId._id?.toString() === userId
                  ) as any
                )?.userId?.username || "Player",
              joinedAt: new Date(),
            },
            currentPlayers: room.currentPlayers,
            maxPlayers: room.maxPlayers,
          });

          // Emit room_updated event
          io.to(room._id.toString()).emit("room_updated", {
            roomId: room._id,
            currentPlayers: room.currentPlayers,
            status: room.status,
          });

          // Check if room is full and emit room_starting
          if (room.currentPlayers === room.maxPlayers) {
            io.to(room._id.toString()).emit("room_starting", {
              roomId: room._id,
              startingIn: 3,
              allPlayers: room.players,
            });

            // Auto-start game after 3 seconds
            setTimeout(() => {
              socket.emit("start_game", { roomId: room._id });
            }, DEFAULT_TIMER_MS);
          }

          console.log(`✅ Player ${userId} joined room ${room._id}`);
          cb?.({ ok: true, room });
        } catch (err: any) {
          console.error("❌ Join room error:", err);
          cb?.({ ok: false, error: err?.message || "server" });
        }
      }
    );

    // chat-message
    socket.on("chat_message", (data: any) => chatMessageRecieved(data, socket));

    // direct-message (user-to-user messaging outside rooms)
    socket.on("direct_message", (data: any) =>
      directMessageReceived(data, socket)
    );

    /************************************************************
     * MATCHMAKING EVENTS (handled by service, exposed via socket)
     ************************************************************/
    // These events are emitted from the service layer:
    // - matchmaking_waiting: Notifies player room was created and waiting
    // - matchmaking_update: Periodic updates during wait (30s, 10s remaining)
    // - matchmaking_success: Another player joined
    // - matchmaking_failed: Timeout, no players joined

    /************************************************************
     * START GAME
     ************************************************************/
    socket.on("start_game", async ({ roomId }, cb?: Function) => {
      console.log("🎮 Start game request:", { userId, roomId });
      try {
        await withTransaction(async (session) => {
          const room = session
            ? await RoomModel.findById(roomId).session(session)
            : await RoomModel.findById(roomId);
          if (!room) return cb?.({ ok: false, error: "room not found" });

          // Validate room is full before starting
          if (room.currentPlayers !== room.maxPlayers)
            return cb?.({
              ok: false,
              error: "room not full - waiting for all players",
            });

          if (room.status !== ROOM_STATUS.WAITING)
            return cb?.({ ok: false, error: "already started" });

          const stake = room.stake || 0;

          const walletType = room.walletType || WALLET_TYPE.FREE_COIN;

          // block stake for each player
          for (const p of room.players) {
            const user = session
              ? await UserModel.findById(p.userId).session(session)
              : await UserModel.findById(p.userId);

            if (!user) return cb?.({ ok: false, error: "user missing" });

            // const wallet =
            //   walletType === WALLET_TYPE.REAL_MONEY
            //     ? user.wallet.realMoneyBalance
            //     : user.wallet.coinBalance;

            // if (wallet.balance - wallet.blocked < stake)
            //   return cb?.({
            //     ok: false,
            //     error: `insufficient funds for ${user._id}`,
            //   });

            // const before = wallet.balance;
            // wallet.blocked += stake;
            // wallet.balance -= stake;

            // await user.save(sessionOptions(session));

            // await TransactionModel.create(
            //   [
            //     {
            //       userId: user._id,
            //       walletType: walletType,
            //       type: TRANSACTION_TYPE.ENTRY_FEE_LOCK,
            //       amount: stake,
            //       before,
            //       after: wallet.balance,
            //       roomId: room._id,
            //       status: TRANSACTION_STATUS.COMPLETED,
            //     },
            //   ],
            //   sessionOptions(session)
            // );
          }

          room.status = ROOM_STATUS.IN_PROGRESS;
          await room.save(sessionOptions(session));

          // dealing cards
          const deckArr = buildDeck(room.deck);
          const seed = crypto.randomBytes(32).toString("hex");
          const shuffled = seededShuffle(deckArr, seed);

          const playersCount = room.players.length;
          const perPlayer = Math.floor(shuffled.length / playersCount);

          for (let i = 0; i < playersCount; i++) {
            const hand = shuffled.slice(i * perPlayer, (i + 1) * perPlayer);

            const targetSocket = onlineUsers.get(
              room.players[i].userId.toString()
            );

            if (targetSocket) io.to(targetSocket).emit("deal", { hand, seed });
          }

          io.to(room._id.toString()).emit("game_started", {
            roomId: room._id.toString(),
            seed,
          });

          console.log(`✅ Game started: ${room._id.toString()}`);
          cb?.({ ok: true });
        });
      } catch (err) {
        console.error("❌ Start game error:", err);
        cb?.({ ok: false, error: "server" });
      }
    });

    /************************************************************
     * SEND FRIEND REQUEST
     ************************************************************/
    socket.on("send_friend_request", async ({ targetUserId }, cb) => {
      try {
        // Validation
        if (!targetUserId || typeof targetUserId !== "string") {
          console.error("❌ Invalid targetUserId");
          return cb?.({ ok: false, error: "Invalid targetUserId" });
        }

        if (targetUserId === userId) {
          return cb?.({
            ok: false,
            error: "Cannot send friend request to yourself",
          });
        }

        const targetUser = await UserModel.findOne({
          $or: [
            { email: targetUserId },
            { username: targetUserId },
            { _id: targetUserId },
          ],
        });

        if (!targetUser) {
          console.error(`❌ Target user not found: ${targetUserId}`);
          return cb?.({ ok: false, error: "User not found" });
        }

        if (targetUser.friendRequests.includes(userId)) {
          return cb?.({ ok: false, error: "Request already sent" });
        }

        targetUser.friendRequests.push(userId);
        await targetUser.save();

        console.log(`✅ Friend request sent from ${userId} to ${targetUserId}`);
        cb?.({ ok: true, message: "Friend request sent" });
      } catch (err) {
        console.error("❌ Send friend request error:", err);
        cb?.({ ok: false, error: "Server error" });
      }
    });

    /************************************************************
     * ACCEPT FRIEND REQUEST
     ************************************************************/
    socket.on("accept_friend_request", async ({ requesterId }, cb) => {
      try {
        // Validation
        if (!requesterId || typeof requesterId !== "string") {
          console.error("❌ Invalid requesterId");
          return cb?.({ ok: false, error: "Invalid requesterId" });
        }

        if (requesterId === userId) {
          return cb?.({
            ok: false,
            error: "Cannot accept request from yourself",
          });
        }

        const requester = await UserModel.findById(requesterId);
        const user = await UserModel.findById(userId);

        if (!requester || !user) {
          console.error(
            `❌ User not found: requester=${!!requester}, user=${!!user}`
          );
          return cb?.({ ok: false, error: "User not found" });
        }

        if (!user.friendRequests.some((id) => id.toString() === requesterId)) {
          return cb?.({ ok: false, error: "No friend request found" });
        }

        // Check if already friends
        if (user.friends.some((id) => id.toString() === requesterId)) {
          return cb?.({ ok: false, error: "Already friends" });
        }

        // Add each other as friends (using string IDs, mongoose will convert)
        user.friends.push(requesterId as any);
        requester.friends.push(userId as any);

        // Remove the friend request
        user.friendRequests = user.friendRequests.filter(
          (id) => id.toString() !== requesterId
        );

        await user.save();
        await requester.save();

        console.log(`✅ Friend request accepted: ${userId} ↔️ ${requesterId}`);
        cb?.({ ok: true, message: "Friend request accepted" });
      } catch (err) {
        console.error("❌ Accept friend request error:", err);
        cb?.({ ok: false, error: "Server error" });
      }
    });

    /************************************************************
     * INVITE FRIEND TO ROOM
     ************************************************************/
    socket.on("invite_to_room", async ({ roomId, targetUserId }, cb) => {
      try {
        // Validation
        if (!roomId || typeof roomId !== "string") {
          console.error("❌ Invalid roomId");
          return cb?.({ ok: false, error: "Invalid roomId" });
        }

        if (!targetUserId || typeof targetUserId !== "string") {
          console.error("❌ Invalid targetUserId");
          return cb?.({ ok: false, error: "Invalid targetUserId" });
        }

        if (targetUserId === userId) {
          return cb?.({ ok: false, error: "Cannot invite yourself" });
        }

        // Validate MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
          return cb?.({ ok: false, error: "Invalid room ID format" });
        }

        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
          return cb?.({ ok: false, error: "Invalid user ID format" });
        }

        const room = await RoomModel.findById(roomId).populate(
          "players.userId",
          "username"
        );
        if (!room) {
          console.error(`❌ Room not found: ${roomId}`);
          return cb?.({ ok: false, error: "Room not found" });
        }

        // Check if room is in waiting status
        if (room.status !== ROOM_STATUS.WAITING) {
          return cb?.({ ok: false, error: "Room is not accepting players" });
        }

        // Check if inviter is in the room
        const inviterInRoom = room.players.find(
          (p) => p.userId.toString() === userId
        );
        if (!inviterInRoom) {
          console.error(`❌ User ${userId} not in room ${roomId}`);
          return cb?.({ ok: false, error: "You are not in this room" });
        }

        // Check if room is full
        if (room.currentPlayers >= room.maxPlayers) {
          return cb?.({ ok: false, error: "Room is full" });
        }

        // Check if target user is already in the room
        const targetInRoom = room.players.find(
          (p) => p.userId.toString() === targetUserId
        );
        if (targetInRoom) {
          return cb?.({ ok: false, error: "User is already in this room" });
        }

        // Verify target user exists and is online
        const targetUser = await UserModel.findById(targetUserId);
        if (!targetUser) {
          return cb?.({ ok: false, error: "User not found" });
        }

        const targetSocketId = onlineUsers.get(targetUserId);
        if (!targetSocketId) {
          return cb?.({ ok: false, error: "User is not online" });
        }

        // Optional: Verify they are friends
        const Friendship = require("../models/Friendship.model").default;
        const friendship = await Friendship.findOne({
          userId: userId,
          friendId: targetUserId,
          status: "ACCEPTED",
        });

        if (!friendship) {
          console.warn(`⚠️  ${userId} inviting non-friend ${targetUserId}`);
        }

        // Send invitation
        io.to(targetSocketId).emit("room_invitation", {
          roomId,
          inviter: userId,
          inviterName: (inviterInRoom.userId as any)?.username || "Unknown",
          roomCode: room.code,
          gameMode: room.gameMode,
          maxPlayers: room.maxPlayers,
          currentPlayers: room.currentPlayers,
          stake: room.stake || 0,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `✅ Room invitation sent: ${userId} → ${targetUserId} (room: ${roomId})`
        );
        cb?.({ ok: true, message: "Invitation sent" });
      } catch (err) {
        console.error("❌ Invite to room error:", err);
        cb?.({ ok: false, error: "Server error" });
      }
    });

    /************************************************************
     * GAME SETUP & CARD DISTRIBUTION EVENTS
     ************************************************************/

    /**
     * game_starting event
     *
     * Emitted by server when game is about to start (3-second countdown)
     * Direction: Server → All players in room
     *
     * Payload:
     * {
     *   roomId: string,
     *   startingIn: number (seconds),
     *   players: Array<{ userId, username }>,
     *   gameLength: number,
     *   maxPlayers: number
     * }
     */

    /**
     * cards_distributed event
     *
     * Emitted by server to each player individually with their cards
     * Direction: Server → Individual player (PRIVATE)
     *
     * Payload:
     * {
     *   roomId: string,
     *   yourCards: string[] (card codes like ["AS", "KH", "QD"]),
     *   totalCards: number
     * }
     *
     * Security: Cards are sent privately to each player's socket
     * Only the player receives their own cards
     */

    /**
     * initial_state event
     *
     * Emitted by server after cards distributed with public game state
     * Direction: Server → All players in room
     *
     * Payload:
     * {
     *   roomId: string,
     *   gameLength: number,
     *   currentFlip: number (starts at 0),
     *   players: Array<{ userId, username, cardCount }>,
     *   status: "IN_PROGRESS",
     *   startedAt: Date
     * }
     *
     * Note: Does NOT include actual cards (public info only)
     */

    /**
     * game_auto_starting event
     *
     * Emitted when room reaches max players and auto-starts
     * Direction: Server → All players in room
     *
     * Payload:
     * {
     *   roomId: string,
     *   startingIn: number (3 seconds),
     *   reason: "Room full"
     * }
     */

    // Note: Actual event emissions happen in game.service.ts
    // These are documentation placeholders for Socket.IO events
    // The service layer emits: game_starting, cards_distributed, initial_state

    /************************************************************
     * RECONNECTION
     ************************************************************/
    socket.on("reconnect_to_game", async ({ roomId }: any, cb?: Function) => {
      try {
        // Validation
        if (!roomId || typeof roomId !== "string") {
          console.error("❌ Invalid roomId for reconnection");
          return cb?.({ ok: false, error: "Invalid roomId" });
        }

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
          return cb?.({ ok: false, error: "Invalid room ID format" });
        }

        const {
          handlePlayerReconnect,
        } = require("../utils/disconnection.utility");

        await handlePlayerReconnect(userId, roomId);

        // Update current room tracking
        currentRoom = roomId;
        socket.join(roomId);

        console.log(`✅ Player ${userId} reconnected to room ${roomId}`);
        cb?.({ ok: true, message: "Reconnected successfully" });
      } catch (error: any) {
        console.error(`❌ Reconnection error for ${userId}:`, error);
        cb?.({ ok: false, error: error.message || "Reconnection failed" });
      }
    });

    /************************************************************
     * UPDATE CURRENT ROOM TRACKING
     *
     * Track which room player is currently in for disconnect handling
     ************************************************************/

    // Update on room join
    socket.on("_track_room", ({ roomId }: any) => {
      currentRoom = roomId;
    });

    // Clear on room leave
    socket.on("leave_room", ({ roomId }: any) => {
      if (currentRoom === roomId) {
        currentRoom = null;
      }
      socket.leave(roomId);
    });
  });
};
