import mongoose from "mongoose";
import Stripe from "stripe";
import { CustomError } from "../../utils/customError.utility";
import WithdrawalRequest from "../../models/WithdrawalRequest.model";
import UserModel from "../../models/User.model";
import Transaction from "../../models/Transaction.model";
import {
  WITHDRAWAL_ERROR,
  MIN_WITHDRAWAL_AMOUNT,
  WITHDRAWAL_FEE,
  DAILY_WITHDRAWAL_LIMIT,
  WITHDRAWAL_METHOD,
  TRANSACTION_STATUS,
  WALLET_TYPE,
  TRANSACTION_TYPE,
} from "../../utils/constants.utility";
import { withTransaction } from "../../utils/transaction.utility";
import { canWithdraw } from "../../utils/kyc.utility";
import { stripe } from "../../utils/stripe.utility";

const ObjectId = mongoose.Types.ObjectId;

class WithdrawalService {
  /**
   * Request withdrawal with KYC validation
   * Atomically deducts amount from wallet and creates withdrawal request
   */
  async requestWithdrawal(
    userId: string,
    amount: number,
    method: string,
    destination: any
  ) {
    try {
      // Validate amount
      if (amount < MIN_WITHDRAWAL_AMOUNT) {
        throw new CustomError(
          `Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}`,
          400
        );
      }

      // Validate method
      if (!Object.values(WITHDRAWAL_METHOD).includes(method as any)) {
        throw new CustomError("Invalid withdrawal method", 400);
      }

      // Check KYC verification status
      const kycCheck = await canWithdraw(userId, amount);
      if (!kycCheck.allowed) {
        throw new CustomError(
          kycCheck.reason || "KYC verification required",
          403
        );
      }

      // Check daily withdrawal limit
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyWithdrawals = await WithdrawalRequest.aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
            status: { $in: ["COMPLETED", "PROCESSING"] },
            requestedAt: { $gte: oneDayAgo },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const dailyWithdrawn = dailyWithdrawals[0]?.total || 0;
      const remainingDaily = DAILY_WITHDRAWAL_LIMIT - dailyWithdrawn;

      if (amount > remainingDaily) {
        throw new CustomError(
          `Daily withdrawal limit exceeded. Remaining: $${remainingDaily.toFixed(
            2
          )}`,
          429
        );
      }

      // Calculate net amount (amount - fee)
      const netAmount = Math.round((amount - WITHDRAWAL_FEE) * 100) / 100;

      // Atomic transaction: Create withdrawal request and deduct from wallet
      let withdrawalRequest: any;

      await withTransaction(async (session) => {
        // Get user and check balance
        const user = await UserModel.findById(userId).session(session);
        if (!user) {
          throw new CustomError("User not found", 404);
        }

        // Check if user has sufficient balance
        if (user.wallet.realMoneyBalance < amount) {
          throw new CustomError(
            `Insufficient balance. Available: $${user.wallet.realMoneyBalance.toFixed(
              2
            )}`,
            400
          );
        }

        // Generate unique withdrawal ID
        const withdrawalId = `WD${Date.now()}${Math.random()
          .toString(36)
          .substring(2, 9)
          .toUpperCase()}`;

        // Create withdrawal request
        const [withdrawal] = await WithdrawalRequest.create(
          [
            {
              withdrawalId,
              userId: new ObjectId(userId),
              amount,
              fee: WITHDRAWAL_FEE,
              netAmount,
              method,
              destination,
              status: "PENDING",
              kycVerified: true, // Already checked via canWithdraw
              requestedAt: new Date(),
            },
          ],
          { session }
        );

        withdrawalRequest = withdrawal;

        // Deduct amount from wallet
        user.wallet.realMoneyBalance =
          Math.round((user.wallet.realMoneyBalance - amount) * 100) / 100;

        // Update total withdrawn
        user.wallet.realMoneyTotalWithdrawn =
          Math.round((user.wallet.realMoneyTotalWithdrawn + amount) * 100) /
          100;

        await user.save({ session });

        // Log transaction
        await Transaction.create(
          [
            {
              userId: new ObjectId(userId),
              type: TRANSACTION_TYPE.WITHDRAWAL,
              amount: -amount, // Negative for withdrawal
              walletType: WALLET_TYPE.REAL_MONEY,
              status: TRANSACTION_STATUS.COMPLETED,
              description: `Withdrawal request ${withdrawalId}`,
              referenceId: withdrawalId,
            },
          ],
          { session }
        );
      });

      // Process withdrawal asynchronously (don't wait)
      this.processWithdrawalAsync(
        withdrawalRequest.withdrawalId,
        method,
        netAmount,
        destination
      ).catch((error) => {
        console.error("Error processing withdrawal:", error);
      });

      return {
        success: true,
        data: {
          withdrawalId: withdrawalRequest.withdrawalId,
          amount,
          fee: WITHDRAWAL_FEE,
          netAmount,
          method,
          status: "PENDING",
          requestedAt: withdrawalRequest.requestedAt,
        },
      };
    } catch (error: any) {
      console.error("Error in requestWithdrawal:", error);
      throw error;
    }
  }

  /**
   * Process withdrawal with payment provider
   * Runs asynchronously after withdrawal request is created
   */
  async processWithdrawalAsync(
    withdrawalId: string,
    method: string,
    amount: number,
    destination: any
  ) {
    try {
      // Update status to PROCESSING
      const withdrawal = await WithdrawalRequest.findOne({ withdrawalId });
      if (!withdrawal) {
        throw new CustomError("Withdrawal request not found", 404);
      }

      withdrawal.status = "PROCESSING";
      withdrawal.processingStartedAt = new Date();
      await withdrawal.save();

      let payoutResult: any;

      // Process based on payment method
      switch (method) {
        case WITHDRAWAL_METHOD.BANK_ACCOUNT:
          payoutResult = await this.processStripeBankTransfer(
            amount,
            destination.bankAccount
          );
          break;

        case WITHDRAWAL_METHOD.PAYPAL:
          payoutResult = await this.processPayPalPayout(
            amount,
            destination.paypal.email
          );
          break;

        case WITHDRAWAL_METHOD.GOOGLE_WALLET:
          payoutResult = await this.processGooglePayPayout(
            amount,
            destination.googleWallet.email
          );
          break;

        default:
          throw new CustomError("Unsupported withdrawal method", 400);
      }

      // Update withdrawal as completed
      withdrawal.status = "COMPLETED";
      withdrawal.completedAt = new Date();
      withdrawal.paymentProvider = payoutResult.provider;
      withdrawal.providerTransactionId = payoutResult.transactionId;
      withdrawal.providerPayoutId = payoutResult.payoutId;
      await withdrawal.save();

      // Notify user via socket
      this.notifyWithdrawalCompleted(withdrawal.userId.toString(), {
        withdrawalId,
        amount: withdrawal.amount,
        netAmount: withdrawal.netAmount,
        method,
        completedAt: withdrawal.completedAt,
      });

      console.log(`Withdrawal ${withdrawalId} completed successfully`);
    } catch (error: any) {
      console.error(`Error processing withdrawal ${withdrawalId}:`, error);

      // Mark withdrawal as failed and refund
      await this.refundFailedWithdrawal(
        withdrawalId,
        error.message || "Payment provider error"
      );
    }
  }

  /**
   * Process Stripe bank transfer
   */
  private async processStripeBankTransfer(
    amount: number,
    bankAccount: any
  ): Promise<any> {
    try {
      // Create Stripe payout (requires connected account or bank account verification)
      // For now, return mock data - implement Stripe Connect in production

      // In production:
      // const payout = await stripe.payouts.create({
      //   amount: Math.round(amount * 100), // Convert to cents
      //   currency: 'usd',
      //   destination: bankAccountId,
      //   method: 'standard',
      // });

      // Mock response for development
      return {
        provider: "STRIPE",
        transactionId: `txn_${Date.now()}`,
        payoutId: `po_${Date.now()}`,
        status: "succeeded",
      };
    } catch (error: any) {
      console.error("Stripe bank transfer error:", error);
      throw new CustomError(`Stripe payout failed: ${error.message}`, 502);
    }
  }

  /**
   * Process PayPal payout
   */
  private async processPayPalPayout(
    amount: number,
    email: string
  ): Promise<any> {
    try {
      // Implement PayPal Payouts API
      // Requires PayPal REST API credentials

      // Mock response for development
      return {
        provider: "PAYPAL",
        transactionId: `PAYPAL_${Date.now()}`,
        payoutId: `PAYOUT_${Date.now()}`,
        status: "succeeded",
      };
    } catch (error: any) {
      console.error("PayPal payout error:", error);
      throw new CustomError(`PayPal payout failed: ${error.message}`, 502);
    }
  }

  /**
   * Process Google Pay payout
   */
  private async processGooglePayPayout(
    amount: number,
    email: string
  ): Promise<any> {
    try {
      // Implement Google Pay Send Money API
      // Requires Google Pay API credentials

      // Mock response for development
      return {
        provider: "GOOGLE_PAY",
        transactionId: `GPAY_${Date.now()}`,
        payoutId: `GPAYOUT_${Date.now()}`,
        status: "succeeded",
      };
    } catch (error: any) {
      console.error("Google Pay payout error:", error);
      throw new CustomError(`Google Pay payout failed: ${error.message}`, 502);
    }
  }

  /**
   * Refund failed withdrawal
   * Credits amount + fee back to user's wallet
   */
  async refundFailedWithdrawal(withdrawalId: string, failureReason: string) {
    try {
      const withdrawal = await WithdrawalRequest.findOne({ withdrawalId });
      if (!withdrawal) {
        throw new CustomError("Withdrawal request not found", 404);
      }

      // Atomic refund transaction
      await withTransaction(async (session) => {
        // Update withdrawal status
        withdrawal.status = "REFUNDED";
        withdrawal.failureReason = failureReason;
        withdrawal.completedAt = new Date();
        await withdrawal.save({ session });

        // Refund to wallet (original amount, not net amount)
        const user = await UserModel.findById(withdrawal.userId).session(
          session
        );
        if (!user) {
          throw new CustomError("User not found", 404);
        }

        user.wallet.realMoneyBalance =
          Math.round((user.wallet.realMoneyBalance + withdrawal.amount) * 100) /
          100;

        // Adjust total withdrawn
        user.wallet.realMoneyTotalWithdrawn =
          Math.round(
            (user.wallet.realMoneyTotalWithdrawn - withdrawal.amount) * 100
          ) / 100;

        await user.save({ session });

        // Log refund transaction
        await Transaction.create(
          [
            {
              userId: withdrawal.userId,
              type: "WITHDRAWAL",
              amount: withdrawal.amount, // Positive for refund
              walletType: "REAL_MONEY",
              status: "REFUNDED",
              description: `Withdrawal refund ${withdrawalId}: ${failureReason}`,
              referenceId: withdrawalId,
            },
          ],
          { session }
        );
      });

      // Notify user via socket
      this.notifyWalletUpdate(withdrawal.userId.toString(), {
        type: "withdrawal_refund",
        withdrawalId,
        amount: withdrawal.amount,
        reason: failureReason,
      });

      console.log(`Withdrawal ${withdrawalId} refunded successfully`);
    } catch (error: any) {
      console.error("Error refunding withdrawal:", error);
      throw error;
    }
  }

  /**
   * Get withdrawal history with filters
   */
  async getWithdrawalHistory(
    userId: string,
    filters: {
      status?: string;
      method?: string;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    try {
      const {
        status,
        method,
        limit = 50,
        offset = 0,
        startDate,
        endDate,
      } = filters;

      const query: any = { userId: new ObjectId(userId) };

      if (status) {
        query.status = status;
      }

      if (method) {
        query.method = method;
      }

      if (startDate || endDate) {
        query.requestedAt = {};
        if (startDate) {
          query.requestedAt.$gte = startDate;
        }
        if (endDate) {
          query.requestedAt.$lte = endDate;
        }
      }

      const [withdrawals, total] = await Promise.all([
        WithdrawalRequest.find(query)
          .sort({ requestedAt: -1 })
          .skip(offset)
          .limit(limit)
          .select("-destination") // Hide sensitive destination details
          .lean(),
        WithdrawalRequest.countDocuments(query),
      ]);

      return {
        success: true,
        data: {
          withdrawals,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        },
      };
    } catch (error: any) {
      console.error("Error in getWithdrawalHistory:", error);
      throw error;
    }
  }

  /**
   * Get single withdrawal details
   */
  async getWithdrawal(userId: string, withdrawalId: string) {
    try {
      const withdrawal = await WithdrawalRequest.findOne({
        _id: new ObjectId(withdrawalId),
        userId: new ObjectId(userId),
      }).lean();
      console.log("getWithdrawal", withdrawalId, userId);

      if (!withdrawal) {
        const error: any = new Error("Withdrawal not found");
        error.code = 404; // Not Found
        throw error;
      }

      return {
        success: true,
        data: withdrawal,
      };
    } catch (error: any) {
      console.error("Error in getWithdrawal:", error);
      throw error;
    }
  }

  /**
   * Cancel pending withdrawal
   * Refunds amount back to wallet
   */
  async cancelWithdrawal(userId: string, withdrawalId: string) {
    try {
      const withdrawal = await WithdrawalRequest.findOne({
        _id: new ObjectId(withdrawalId),
        userId: new ObjectId(userId),
      });

      if (!withdrawal) {
        throw new CustomError("Withdrawal not found", 404);
      }

      // Only PENDING withdrawals can be cancelled
      if (withdrawal.status !== "PENDING") {
        throw new CustomError(
          `Cannot cancel withdrawal with status ${withdrawal.status}`,
          409
        );
      }

      // Atomic cancellation transaction
      await withTransaction(async (session) => {
        // Update withdrawal status
        withdrawal.status = "CANCELLED";
        withdrawal.completedAt = new Date();
        await withdrawal.save({ session });

        // Refund to wallet
        const user = await UserModel.findById(userId).session(session);
        if (!user) {
          throw new CustomError("User not found", 404);
        }

        user.wallet.realMoneyBalance =
          Math.round((user.wallet.realMoneyBalance + withdrawal.amount) * 100) /
          100;

        // Adjust total withdrawn
        user.wallet.realMoneyTotalWithdrawn =
          Math.round(
            (user.wallet.realMoneyTotalWithdrawn - withdrawal.amount) * 100
          ) / 100;

        await user.save({ session });

        // Log cancellation transaction
        await Transaction.create(
          [
            {
              userId: new ObjectId(userId),
              type: "WITHDRAWAL",
              amount: withdrawal.amount, // Positive for refund
              walletType: WALLET_TYPE.REAL_MONEY,
              status: TRANSACTION_STATUS.REFUNDED,
              description: `Withdrawal cancelled ${withdrawalId}`,
              referenceId: withdrawalId,
            },
          ],
          { session }
        );
      });

      // Notify user via socket
      this.notifyWalletUpdate(userId, {
        type: "withdrawal_cancelled",
        withdrawalId,
        amount: withdrawal.amount,
      });

      return {
        success: true,
        message: "Withdrawal cancelled successfully",
      };
    } catch (error: any) {
      console.error("Error in cancelWithdrawal:", error);
      throw error;
    }
  }

  /**
   * Notify user of wallet update via socket
   */
  private notifyWalletUpdate(userId: string, data: any) {
    try {
      const { emitWalletUpdated } = require("../../socket/index");
      emitWalletUpdated(userId, data);
    } catch (error) {
      console.error("Error emitting wallet update:", error);
    }
  }

  /**
   * Notify user of withdrawal completion via socket
   */
  private notifyWithdrawalCompleted(userId: string, data: any) {
    try {
      const { emitWithdrawalCompleted } = require("../../socket/index");
      emitWithdrawalCompleted(userId, data);

      // Send notification
      const notificationService =
        require("../notification/notification.service").default;
      notificationService
        .sendNotification(userId, {
          type: "WITHDRAWAL_COMPLETED",
          title: "Withdrawal Completed",
          message: `$${
            data.netAmount?.toFixed(2) || data.amount?.toFixed(2)
          } has been sent to your account`,
          data: {
            withdrawalId: data.withdrawalId,
            amount: data.amount,
            netAmount: data.netAmount,
            method: data.method,
          },
          priority: "HIGH",
        })
        .catch((err: any) => {
          console.error("Error sending withdrawal notification:", err);
        });
    } catch (error) {
      console.error("Error emitting withdrawal completed:", error);
    }
  }
}

export default new WithdrawalService();
