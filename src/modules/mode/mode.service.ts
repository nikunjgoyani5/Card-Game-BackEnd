import User from "../../models/User.model";
import { CustomError } from "../../utils/customError.utility";
import { WALLET_TYPE, MODE_ERROR } from "../../utils/constants.utility";
import {
  safeRedisGet,
  asyncRedisSet,
  asyncRedisDel,
} from "../../utils/redis.utility";
import roomService from "../room/room.service";

class ModeService {
  // Select game mode
  async selectMode(userId: string, mode: string) {
    // Validate mode
    if (mode !== WALLET_TYPE.FREE_COIN && mode !== WALLET_TYPE.REAL_MONEY) {
      throw new CustomError(
        `${MODE_ERROR.INVALID_MODE}: Invalid mode. Allowed: FREE_COIN, REAL_MONEY`,
        400
      );
    }

    // Check if user is in an active game using Redis
    const activeRoom = await safeRedisGet(`activeroom:${userId}`, 500);
    if (activeRoom) {
      throw new CustomError(
        `${MODE_ERROR.CANNOT_CHANGE_IN_GAME}: Cannot change mode while in an active game`,
        409
      );
    }

    const user = await User.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    // Update last selected mode in MongoDB
    user.lastSelectedMode = mode;
    await user.save();

    // Store mode in Redis session with 1 hour TTL (fire and forget)
    asyncRedisSet(`session:${userId}:currentMode`, mode, 3600);

    // Get wallet balance based on mode
    const wallet =
      mode === WALLET_TYPE.FREE_COIN
        ? {
            balance: user.wallet.coinBalance,
            locked: user.wallet.coinLocked,
          }
        : {
            balance: user.wallet.realMoneyBalance,
            locked: user.wallet.realMoneyLocked,
          };

    return {
      mode,
      wallet,
    };
  }

  // Get current mode
  async getCurrentMode(userId: string) {
    // First check Redis for active session (with timeout)
    const modeFromRedis = await safeRedisGet(
      `session:${userId}:currentMode`,
      500
    );
    if (modeFromRedis) {
      // Extend TTL on access (fire and forget)
      asyncRedisSet(`session:${userId}:currentMode`, modeFromRedis, 3600);

      const user = await User.findById(userId);
      if (!user) throw new CustomError("User not found", 404);

      const wallet =
        modeFromRedis === WALLET_TYPE.REAL_MONEY
          ? {
              balance: user.wallet.realMoneyBalance,
              locked: user.wallet.realMoneyLocked,
            }
          : {
              balance: user.wallet.coinBalance,
              locked: user.wallet.coinLocked,
            };

      return { mode: modeFromRedis, wallet };
    }

    const user = await User.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    // Default to FREE_COIN if no mode is selected
    let mode = user.lastSelectedMode || WALLET_TYPE.FREE_COIN;

    // If no mode was set, save FREE_COIN as default
    if (!user.lastSelectedMode) {
      user.lastSelectedMode = WALLET_TYPE.FREE_COIN;
      await user.save();
      // Store in Redis session
      asyncRedisSet(
        `session:${userId}:currentMode`,
        WALLET_TYPE.FREE_COIN,
        3600
      );
    }

    // TODO: Check if user is in an active game using Redis
    let inGame = false;
    try {
      await roomService.checkUserNotInGame(userId);
      inGame = true;
    } catch (e) {
      console.log("not in game");
    }

    // Get wallet balance based on mode
    const wallet =
      mode === WALLET_TYPE.REAL_MONEY
        ? {
            balance: user.wallet.realMoneyBalance,
            locked: user.wallet.realMoneyLocked,
          }
        : {
            balance: user.wallet.coinBalance,
            locked: user.wallet.coinLocked,
          };

    return {
      mode,
      inGame: inGame, // TODO: Get from Redis
      wallet,
    };
  }

  // Refresh mode session (extend TTL)
  async refreshModeSession(userId: string) {
    const modeFromRedis = await safeRedisGet(
      `session:${userId}:currentMode`,
      500
    );
    if (modeFromRedis) {
      asyncRedisSet(`session:${userId}:currentMode`, modeFromRedis, 3600);
    }
  }

  // Clear mode session
  async clearModeSession(userId: string) {
    asyncRedisDel(`session:${userId}:currentMode`);
  }
}

export default new ModeService();
