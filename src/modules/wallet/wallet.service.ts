import User from "../../models/User.model";
import Transaction from "../../models/Transaction.model";
import { CustomError } from "../../utils/customError.utility";
import { stripe } from "../../utils/stripe.utility";
import mongoose from "mongoose";
import {
  safeRedisGet,
  safeRedisIncr,
  safeRedisExpire,
  asyncRedisSet,
} from "../../utils/redis.utility";
import {
  withTransaction,
  sessionOptions,
} from "../../utils/transaction.utility";
import {
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  WALLET_TYPE,
  COIN_PACKAGES,
  WALLET_ERROR,
  DAILY_AD_LIMIT,
} from "../../utils/constants.utility";

// Helper function to calculate ad reward coins
function getAdCoins(adRevenue: number): number {
  return Math.floor(200 * Math.pow(adRevenue, 1.12));
}

class WalletService {
  // Get wallet balance
  async getBalance(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    return {
      realMoney: {
        available: user.wallet.realMoneyBalance,
        locked: user.wallet.realMoneyLocked,
        total: user.wallet.realMoneyBalance + user.wallet.realMoneyLocked,
        totalDeposited: user.wallet.realMoneyTotalDeposited,
        totalWithdrawn: user.wallet.realMoneyTotalWithdrawn,
      },
      coins: {
        available: user.wallet.coinBalance,
        locked: user.wallet.coinLocked,
        total: user.wallet.coinBalance + user.wallet.coinLocked,
        totalEarned: user.wallet.coinTotalEarned,
      },
      lastUpdated: user.wallet.lastUpdated,
    };
  }

  // Lock entry fee
  async lockEntryFee(
    userId: string,
    amount: number,
    gameMode: string,
    roomId: string,
    ipAddress?: string,
    deviceId?: string
  ) {
    if (amount <= 0) {
      throw new CustomError(
        `${WALLET_ERROR.INVALID_AMOUNT}: Amount must be greater than 0`,
        400
      );
    }

    // CRITICAL: Fraud detection for multi-accounting
    if (ipAddress || deviceId) {
      const { detectMultiAccounting } = require("../../utils/fraud.utility");
      await detectMultiAccounting(userId, ipAddress, deviceId);
    }

    return await withTransaction(async (session) => {
      const user = await User.findById(userId).session(session);
      if (!user) throw new CustomError("User not found", 404);

      if (gameMode === WALLET_TYPE.FREE_COIN) {
        if (user.wallet.coinBalance < amount) {
          throw new CustomError(
            `${WALLET_ERROR.INSUFFICIENT_BALANCE}: Insufficient coin balance. Required: ${amount}, Available: ${user.wallet.coinBalance}`,
            400
          );
        }
        user.wallet.coinBalance -= amount;
        user.wallet.coinLocked += amount;
      } else {
        if (user.wallet.realMoneyBalance < amount) {
          throw new CustomError(
            `${WALLET_ERROR.INSUFFICIENT_BALANCE}: Insufficient real money balance. Required: ${amount}, Available: ${user.wallet.realMoneyBalance}`,
            400
          );
        }
        user.wallet.realMoneyBalance -= amount;
        user.wallet.realMoneyLocked += amount;
      }

      user.wallet.version += 1;
      user.wallet.lastUpdated = new Date();
      await user.save(sessionOptions(session));

      await Transaction.create(
        [
          {
            userId,
            roomId,
            type: TRANSACTION_TYPE.ENTRY_FEE_LOCK,
            amount,
            walletType: gameMode,
            balanceAfter:
              gameMode === WALLET_TYPE.FREE_COIN
                ? user.wallet.coinBalance
                : user.wallet.realMoneyBalance,
            status: TRANSACTION_STATUS.COMPLETED,
            ipAddress,
            deviceId,
          },
        ],
        sessionOptions(session)
      );

      return { success: true };
    });
  }

  // Unlock entry fee
  async unlockEntryFee(
    userId: string,
    amount: number,
    gameMode: string,
    roomId: string,
    ipAddress?: string,
    deviceId?: string
  ) {
    if (amount <= 0) {
      throw new CustomError(
        `${WALLET_ERROR.INVALID_AMOUNT}: Amount must be greater than 0`,
        400
      );
    }

    return await withTransaction(async (session) => {
      const user = await User.findById(userId).session(session);
      if (!user) throw new CustomError("User not found", 404);

      if (gameMode === WALLET_TYPE.FREE_COIN) {
        if (user.wallet.coinLocked < amount) {
          throw new CustomError(
            `${WALLET_ERROR.INSUFFICIENT_LOCKED}: Insufficient locked coin balance to unlock`,
            400
          );
        }
        user.wallet.coinLocked -= amount;
        user.wallet.coinBalance += amount;
      } else {
        if (user.wallet.realMoneyLocked < amount) {
          throw new CustomError(
            `${WALLET_ERROR.INSUFFICIENT_LOCKED}: Insufficient locked real money balance to unlock`,
            400
          );
        }
        user.wallet.realMoneyLocked -= amount;
        user.wallet.realMoneyBalance += amount;
      }

      user.wallet.version += 1;
      user.wallet.lastUpdated = new Date();
      await user.save(sessionOptions(session));

      await Transaction.create(
        [
          {
            userId,
            roomId,
            type: TRANSACTION_TYPE.ENTRY_FEE_UNLOCK,
            amount,
            walletType: gameMode,
            balanceAfter:
              gameMode === WALLET_TYPE.FREE_COIN
                ? user.wallet.coinBalance
                : user.wallet.realMoneyBalance,
            status: TRANSACTION_STATUS.COMPLETED,
            ipAddress,
            deviceId,
          },
        ],
        sessionOptions(session)
      );

      return { success: true };
    });
  }

  // Buy coins with real money
  async buyCoins(
    userId: string,
    packageId: string,
    ipAddress?: string,
    deviceId?: string
  ) {
    const pkg = COIN_PACKAGES[packageId];
    if (!pkg) {
      throw new CustomError(
        `${WALLET_ERROR.INVALID_PACKAGE}: Invalid package ID. Allowed: COIN_PKG_1/5/10/20`,
        400
      );
    }

    return await withTransaction(async (session) => {
      const user = await User.findById(userId).session(session);
      if (!user) throw new CustomError("User not found", 404);

      if (user.wallet.realMoneyBalance < pkg.cost) {
        throw new CustomError(
          `${WALLET_ERROR.INSUFFICIENT_BALANCE}: Insufficient real money. Required: $${pkg.cost}, Available: $${user.wallet.realMoneyBalance}`,
          400
        );
      }

      const realMoneyBefore = user.wallet.realMoneyBalance;
      const coinsBefore = user.wallet.coinBalance;

      // Deduct real money
      user.wallet.realMoneyBalance -= pkg.cost;
      // Add coins
      user.wallet.coinBalance += pkg.coins;
      user.wallet.coinTotalEarned += pkg.coins;

      user.wallet.version += 1;
      user.wallet.lastUpdated = new Date();
      await user.save(sessionOptions(session));

      // Create transaction logs
      await Transaction.create(
        [
          {
            userId,
            type: TRANSACTION_TYPE.COIN_PURCHASE,
            amount: -pkg.cost,
            walletType: WALLET_TYPE.REAL_MONEY,
            balanceAfter: user.wallet.realMoneyBalance,
            packageId,
            status: TRANSACTION_STATUS.COMPLETED,
            ipAddress,
            deviceId,
          },
          {
            userId,
            type: TRANSACTION_TYPE.COIN_PURCHASE,
            amount: pkg.coins,
            walletType: WALLET_TYPE.FREE_COIN,
            balanceAfter: user.wallet.coinBalance,
            packageId,
            status: TRANSACTION_STATUS.COMPLETED,
            ipAddress,
            deviceId,
          },
        ],
        sessionOptions(session)
      );

      return {
        purchaseId: `txn_${Date.now()}`,
        package: packageId,
        costUSD: pkg.cost,
        coinsReceived: pkg.coins,
        newCoinBalance: user.wallet.coinBalance,
        newRealMoneyBalance: user.wallet.realMoneyBalance,
      };
    });
  }

  async grantAdReward(
    userId: string,
    adId: string,
    adRevenue: number,
    ipAddress?: string,
    deviceId?: string
  ) {
    // Check daily ad limit using Redis (with timeout)
    const adCountKey = `ad_count:${userId}:${
      new Date().toISOString().split("T")[0]
    }`;
    const dailyAdCount = await safeRedisGet(adCountKey, 500);
    const currentCount = dailyAdCount ? parseInt(dailyAdCount) : 0;

    if (currentCount >= DAILY_AD_LIMIT) {
      throw new CustomError(
        `${WALLET_ERROR.DAILY_AD_LIMIT}: Daily ad limit reached (10/day). Try again tomorrow.`,
        429
      );
    }

    const coins = getAdCoins(adRevenue);

    return await withTransaction(async (session) => {
      const user = await User.findById(userId).session(session);
      if (!user) throw new CustomError("User not found", 404);

      user.wallet.coinBalance += coins;
      user.wallet.coinTotalEarned += coins;
      user.wallet.version += 1;
      user.wallet.lastUpdated = new Date();
      await user.save(sessionOptions(session));

      await Transaction.create(
        [
          {
            userId,
            type: TRANSACTION_TYPE.AD_REWARD,
            amount: coins,
            walletType: WALLET_TYPE.FREE_COIN,
            balanceAfter: user.wallet.coinBalance,
            adId,
            adRevenue,
            status: TRANSACTION_STATUS.COMPLETED,
            ipAddress,
            deviceId,
          },
        ],
        sessionOptions(session)
      );

      // Increment daily ad count in Redis (with timeout protection)
      let adsWatchedToday = 1;
      const adCountKey = `ad_count:${userId}:${
        new Date().toISOString().split("T")[0]
      }`;
      adsWatchedToday = await safeRedisIncr(adCountKey, 500);
      if (adsWatchedToday === 0) adsWatchedToday = 1; // Fallback if Redis fails

      // Set expiry at end of day (fire and forget)
      const now = new Date();
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
      const ttl = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
      safeRedisExpire(adCountKey, ttl);

      return {
        coinsAwarded: coins,
        newCoinBalance: user.wallet.coinBalance,
        adsWatchedToday,
        adsRemainingToday: DAILY_AD_LIMIT - adsWatchedToday,
      };
    });
  }

  // Legacy deposit method (keeping for backward compatibility)
  async deposit(userId: string, amount: number, walletType: string) {
    const user = await User.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // $ to cents
      currency: "usd",
      metadata: {
        userId,
        walletType,
      },
    });

    const txn = await Transaction.create({
      userId,
      walletType,
      type: TRANSACTION_TYPE.DEPOSIT,
      amount,
      balanceAfter: user.wallet.realMoneyBalance,
      status: TRANSACTION_STATUS.PENDING,
    });

    return { clientSecret: paymentIntent.client_secret, txnId: txn._id };
  }

  // Legacy confirm deposit (keeping for backward compatibility)
  async confirmDeposit(event: any) {
    const paymentIntent = event.data.object;

    const userId = paymentIntent.metadata.userId;
    const amount = paymentIntent.amount / 100;

    const user = await User.findById(userId);
    if (!user) return;

    const before = user.wallet.realMoneyBalance;
    const after = before + amount;

    user.wallet.realMoneyBalance = after;
    user.wallet.realMoneyTotalDeposited += amount;
    user.wallet.version += 1;
    user.wallet.lastUpdated = new Date();
    await user.save();

    await Transaction.findOneAndUpdate(
      {
        userId,
        amount,
        type: TRANSACTION_TYPE.DEPOSIT,
        status: TRANSACTION_STATUS.PENDING,
      },
      {
        balanceAfter: after,
        status: TRANSACTION_STATUS.COMPLETED,
      }
    );
  }

  // Legacy withdraw (keeping for backward compatibility)
  async withdraw(
    userId: string,
    amount: number,
    walletType: string,
    bankAccountId: string
  ) {
    // CRITICAL: KYC verification before withdrawal (LEGAL REQUIREMENT)
    const { canWithdraw } = require("../../utils/kyc.utility");
    const kycCheck = await canWithdraw(userId, amount);

    if (!kycCheck.allowed) {
      throw new CustomError(
        kycCheck.reason || "KYC verification required",
        403
      );
    }

    // CRITICAL: Fraud detection for rapid withdrawals
    const { detectRapidWithdrawal } = require("../../utils/fraud.utility");
    await detectRapidWithdrawal(userId);

    const user = await User.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    if (user.wallet.realMoneyBalance < amount) {
      throw new CustomError(
        `${WALLET_ERROR.INSUFFICIENT_BALANCE}: Insufficient real money balance`,
        400
      );
    }

    const before = user.wallet.realMoneyBalance;

    user.wallet.realMoneyBalance -= amount;
    user.wallet.realMoneyTotalWithdrawn += amount;
    user.wallet.version += 1;
    user.wallet.lastUpdated = new Date();
    await user.save();

    const transfer = await stripe.transfers.create({
      amount: amount * 100,
      currency: "usd",
      destination: bankAccountId,
    });

    const txn = await Transaction.create({
      userId,
      walletType,
      type: TRANSACTION_TYPE.WITHDRAWAL,
      amount,
      balanceAfter: user.wallet.realMoneyBalance,
      status: TRANSACTION_STATUS.COMPLETED,
    });

    return { transferId: transfer.id, txnId: txn._id };
  }
}

export default new WalletService();
