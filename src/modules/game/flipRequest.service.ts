import mongoose from "mongoose";
import RoomModel from "../../models/Room.model";
import UserModel from "../../models/User.model";
import TransactionModel from "../../models/Transaction.model";
import { CustomError } from "../../utils/customError.utility";
import {
  FLIP_ERROR,
  WALLET_ERROR,
  GAME_ERROR,
  ROOM_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
} from "../../utils/constants.utility";
import { gameTimers } from "../../utils/flipTimer.utility";
import { withTransaction } from "../../utils/transaction.utility";
import redis from "../../config/redis";

interface FlipRequest {
  userId: string;
  username: string;
  bidAmount: number;
  expiresAt: number;
}

class FlipRequestService {
  /**
   * Calculate minimum bid for flip request
   * Formula: (entryFee / totalCardsPerPlayer) * 0.10
   */
  private calculateMinimumBid(
    entryFee: number,
    cardsPerPlayer: number
  ): number {
    return (entryFee / cardsPerPlayer) * 0.1;
  }

  /**
   * Refund flip request bid to player
   */
  private async refundFlipRequest(
    userId: string,
    bidAmount: number,
    gameMode: string
  ): Promise<void> {
    await withTransaction(async (session) => {
      const user = await UserModel.findById(userId).session(session);
      if (!user) return;

      if (gameMode === "FREE_COIN") {
        user.wallet.coinBalance += bidAmount;
      } else {
        user.wallet.realMoneyBalance += bidAmount;
      }

      await user.save({ session });

      await TransactionModel.create(
        [
          {
            userId,
            roomId: null,
            type: TRANSACTION_TYPE.FLIP_REQUEST_REFUND,
            amount: bidAmount,
            walletType: gameMode,
            status: TRANSACTION_STATUS.COMPLETED,
          },
        ],
        { session }
      );
    });
  }

  /**
   * Process flip request from player
   */
  async processFlipRequest(
    roomId: string,
    userId: string,
    bidAmount: number
  ): Promise<{
    requestId: string;
    bidAmount: number;
    expiresAt: string;
    minimumNextBid: number;
  }> {
    // Validate bidAmount is positive and has max 2 decimal places
    if (bidAmount <= 0 || !Number.isFinite(bidAmount)) {
      throw new CustomError(
        FLIP_ERROR.BID_TOO_LOW + ": Invalid bid amount",
        400
      );
    }

    // Round to 2 decimal places to prevent precision issues
    bidAmount = Math.round(bidAmount * 100) / 100;

    // Get room and validate
    const room = await RoomModel.findById(roomId).populate("players.userId");
    if (!room) {
      throw new CustomError("Room not found", 404);
    }

    if (room.status !== ROOM_STATUS.IN_PROGRESS) {
      throw new CustomError(GAME_ERROR.INVALID_ROOM_STATE, 409);
    }

    // Validate no flip is currently being processed
    const isFlipProcessing = await redis.get(`flipprocessing:${roomId}`);
    if (isFlipProcessing) {
      throw new CustomError(
        "Cannot place flip request while a flip is being processed",
        409
      );
    }

    // Validate player is in room
    const playerInRoom = room.players.some(
      (p) => p.userId?._id.toString() === userId
    );
    console.log(":playerInRoom:", playerInRoom, room.players);

    if (!playerInRoom) {
      throw new CustomError(FLIP_ERROR.NOT_IN_GAME, 403);
    }

    // Calculate minimum bid
    const cardsPerPlayer = Math.floor(room.gameLength / room.maxPlayers);
    const minimumBid = this.calculateMinimumBid(room.entryFee, cardsPerPlayer);

    // Validate bid amount
    if (bidAmount < minimumBid) {
      throw new CustomError(
        `${
          FLIP_ERROR.BID_TOO_LOW
        }: Bid amount below minimum. Minimum: $${minimumBid.toFixed(2)}`,
        400
      );
    }

    // Check for active request in Redis
    const activeRequestKey = `fliprequest:${roomId}`;
    const activeRequestData = await redis.get(activeRequestKey);

    let previousRequester: FlipRequest | null = null;
    if (activeRequestData) {
      previousRequester = JSON.parse(activeRequestData);
      if (previousRequester && bidAmount <= previousRequester.bidAmount) {
        throw new CustomError(
          `${
            FLIP_ERROR.BID_NOT_HIGHER
          }: Bid must be higher than current request: $${previousRequester.bidAmount.toFixed(
            2
          )}`,
          400
        );
      }
    }

    // Deduct bid from player's balance (atomic transaction)
    const result = await withTransaction(async (session) => {
      const user = await UserModel.findById(userId).session(session);
      if (!user) {
        throw new CustomError("User not found", 404);
      }

      // Check balance and deduct
      if (room.gameMode === "FREE_COIN") {
        if (user.wallet.coinBalance < bidAmount) {
          throw new CustomError(WALLET_ERROR.INSUFFICIENT_BALANCE, 400);
        }
        user.wallet.coinBalance -= bidAmount;
      } else {
        if (user.wallet.realMoneyBalance < bidAmount) {
          throw new CustomError(WALLET_ERROR.INSUFFICIENT_BALANCE, 400);
        }
        user.wallet.realMoneyBalance -= bidAmount;
      }

      await user.save({ session });

      // Log transaction
      await TransactionModel.create(
        [
          {
            userId,
            roomId,
            type: TRANSACTION_TYPE.FLIP_REQUEST_BID,
            amount: -bidAmount,
            walletType: room.gameMode,
            status: TRANSACTION_STATUS.COMPLETED,
          },
        ],
        { session }
      );

      return { user, username: user.username };
    });

    // Refund previous requester if any
    if (previousRequester) {
      await this.refundFlipRequest(
        previousRequester.userId,
        previousRequester.bidAmount,
        room.gameMode
      );

      // Emit rejection to previous requester
      try {
        const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
        if (io) {
          io.to(previousRequester.userId).emit("flip_request_rejected", {
            roomId,
            reason: "Outbid by higher amount",
            higherBidAmount: bidAmount,
          });
        }
      } catch (err) {
        console.error("Error emitting flip_request_rejected:", err);
      }

      console.log(
        `🔄 Refunded previous flip request: ${previousRequester.username} - $${previousRequester.bidAmount}`
      );
    }

    // Store flip request in Redis (5-second expiry)
    const expiresAt = Date.now() + 5000;
    const requestId = `req_${roomId}_${Date.now()}`;

    // Store in Redis with 5-second  expiry
    await redis.setex(
      `fliprequest:${roomId}`,
      5,
      JSON.stringify({
        userId,
        username: result.username,
        bidAmount,
        expiresAt,
      })
    );

    console.log(
      `💰 Flip request placed: ${result.username} bid $${bidAmount} for room ${roomId}`
    );

    // Reset game timer to 5 seconds
    gameTimers.resetTimer(roomId, 5000);

    // Emit event to all players in room
    try {
      const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
      if (io) {
        io.to(roomId).emit("flip_request_placed", {
          roomId,
          requester: {
            userId,
            username: result.username,
          },
          bidAmount,
          expiresAt: new Date(expiresAt).toISOString(),
          minimumNextBid: bidAmount + 0.1,
          timerReset: 5000,
        });
      }
    } catch (err) {
      console.error("Error emitting flip_request_placed:", err);
    }

    // Schedule auto-grant after 5 seconds
    setTimeout(async () => {
      try {
        // Check if request is still active in Redis
        const stillActive = await redis.get(`fliprequest:${roomId}`);
        if (stillActive) {
          const request = JSON.parse(stillActive);
          if (request.userId === userId) {
            // Grant flip rights
            try {
              const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
              if (io) {
                io.to(roomId).emit("flip_rights_granted", {
                  roomId,
                  grantedTo: { userId, username: result.username },
                  finalBidAmount: bidAmount,
                });
              }
            } catch (err) {
              console.error("Error emitting flip_rights_granted:", err);
            }

            // Allow this player to flip
            await redis.hset(`game:${roomId}`, "currentTurnPlayer", userId);

            console.log(
              `✅ Flip rights granted to ${result.username} after 5 seconds`
            );
          }
        }
      } catch (error) {
        console.error("Error in auto-grant flip rights:", error);
      }
    }, 5000);

    return {
      requestId,
      bidAmount,
      expiresAt: new Date(expiresAt).toISOString(),
      minimumNextBid: bidAmount + 0.1,
    };
  }

  /**
   * Get active flip request for a room
   */
  async getActiveFlipRequest(roomId: string): Promise<FlipRequest | null> {
    try {
      const activeRequestData = await redis.get(`fliprequest:${roomId}`);
      if (activeRequestData) {
        return JSON.parse(activeRequestData);
      }
      return null;
    } catch (error) {
      console.error("Error getting active flip request:", error);
      return null;
    }
  }

  /**
   * Cancel active flip request (admin function)
   */
  async cancelFlipRequest(roomId: string, gameMode: string): Promise<void> {
    try {
      const activeRequestData = await redis.get(`fliprequest:${roomId}`);
      if (activeRequestData) {
        const request: FlipRequest = JSON.parse(activeRequestData);
        await this.refundFlipRequest(
          request.userId,
          request.bidAmount,
          gameMode
        );
        await redis.del(`fliprequest:${roomId}`);

        // Notify the player that their request was cancelled
        try {
          const { io } = await import("../../socket/index"); // lazy load to avoid circular dependency
          if (io) {
            io.to(request.userId).emit("flip_request_cancelled", {
              roomId,
              reason: "Cancelled by admin",
              refundAmount: request.bidAmount,
            });
          }
        } catch (err) {
          console.error("Error emitting flip_request_cancelled:", err);
        }

        console.log(
          `❌ Flip request cancelled for ${request.username} in room ${roomId}`
        );
      }
    } catch (error) {
      console.error("Error cancelling flip request:", error);
      throw error;
    }
  }
}

export default new FlipRequestService();
