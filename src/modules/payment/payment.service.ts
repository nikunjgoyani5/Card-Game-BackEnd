import mongoose from "mongoose";
import Stripe from "stripe";
import PaymentTransaction from "../../models/PaymentTransaction.model";
import UserModel from "../../models/User.model";
import Transaction from "../../models/Transaction.model";
import { CustomError } from "../../utils/customError.utility";
import {
  PAYMENT_ERROR,
  MIN_DEPOSIT_AMOUNT,
  MAX_DEPOSIT_AMOUNT,
  DEPOSIT_FEE_PERCENTAGE,
  PAYMENT_METHOD,
} from "../../utils/constants.utility";
import { withTransaction } from "../../utils/transaction.utility";
import { stripe } from "../../utils/stripe.utility";

const ObjectId = mongoose.Types.ObjectId;

class PaymentService {
  /**
   * Initiate deposit transaction
   * Creates payment session with Stripe/PayPal/GooglePay
   */
  async initiateDeposit(
    userId: string,
    amount: number,
    paymentMethod: string,
    returnUrl: string,
    cancelUrl: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      // Validate amount
      if (amount < MIN_DEPOSIT_AMOUNT) {
        const error: any = new Error(
          `Minimum deposit amount is $${MIN_DEPOSIT_AMOUNT}`
        );
        error.code = PAYMENT_ERROR.AMOUNT_TOO_LOW;
        throw error;
      }

      if (amount > MAX_DEPOSIT_AMOUNT) {
        const error: any = new Error(
          `Maximum deposit amount is $${MAX_DEPOSIT_AMOUNT}`
        );
        error.code = PAYMENT_ERROR.AMOUNT_TOO_HIGH;
        throw error;
      }

      // Validate payment method
      if (!Object.values(PAYMENT_METHOD).includes(paymentMethod as any)) {
        const error: any = new Error("Invalid payment method");
        error.code = PAYMENT_ERROR.INVALID_PAYMENT_METHOD;
        throw error;
      }

      // Calculate fee (3%)
      const fee = Math.round(amount * DEPOSIT_FEE_PERCENTAGE * 100) / 100;
      const totalAmount = Math.round((amount + fee) * 100) / 100;

      // Create pending transaction in database
      const result = await withTransaction(async (session) => {
        const paymentTransaction = new PaymentTransaction({
          userId: new ObjectId(userId),
          type: "DEPOSIT",
          amount: amount,
          fee: fee,
          totalAmount: totalAmount,
          netAmount: amount,
          paymentMethod: paymentMethod,
          paymentProvider: this.getProvider(paymentMethod),
          status: "PENDING",
          returnUrl,
          cancelUrl,
          ipAddress,
          userAgent,
          metadata: {
            createdVia: "API",
          },
        });

        await paymentTransaction.save({ session });
        return paymentTransaction;
      });

      // Create payment session with provider
      let paymentUrl: string;
      let sessionId: string;

      if (paymentMethod === PAYMENT_METHOD.CREDIT_CARD) {
        const stripeSession = await this.createStripeSession(
          result.transactionId,
          userId,
          totalAmount,
          returnUrl,
          cancelUrl
        );

        paymentUrl = stripeSession.url!;
        sessionId = stripeSession.id;

        // Store Stripe session ID
        await PaymentTransaction.updateOne(
          { transactionId: result.transactionId },
          {
            $set: {
              providerSessionId: sessionId,
              providerPaymentIntentId: stripeSession.payment_intent as string,
            },
          }
        );
      } else if (paymentMethod === PAYMENT_METHOD.PAYPAL) {
        // PayPal integration would go here
        // For now, return placeholder
        paymentUrl = `https://paypal.com/checkout?token=${result.transactionId}`;
        sessionId = result.transactionId;
      } else if (paymentMethod === PAYMENT_METHOD.GOOGLE_PAY) {
        // Google Pay integration would go here
        paymentUrl = `https://pay.google.com/checkout?token=${result.transactionId}`;
        sessionId = result.transactionId;
      }

      return {
        transactionId: result.transactionId,
        amount: result.amount,
        fee: result.fee,
        totalAmount: result.totalAmount,
        paymentMethod: result.paymentMethod,
        paymentUrl: paymentUrl!,
        sessionId: sessionId!,
        expiresAt: result.expiresAt,
      };
    } catch (error: any) {
      console.error("Error initiating deposit:", error);
      throw error;
    }
  }

  /**
   * Create Stripe checkout session
   */
  private async createStripeSession(
    transactionId: string,
    userId: string,
    totalAmount: number,
    returnUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Wallet Deposit",
                description: `Deposit to card game wallet`,
              },
              unit_amount: Math.round(totalAmount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&transaction_id=${transactionId}`,
        cancel_url: `${cancelUrl}?transaction_id=${transactionId}`,
        metadata: {
          transactionId,
          userId,
          type: "DEPOSIT",
        },
      });

      return session;
    } catch (error: any) {
      console.error("Error creating Stripe session:", error);
      const err: any = new Error("Failed to create payment session");
      err.code = PAYMENT_ERROR.PAYMENT_FAILED;
      throw err;
    }
  }

  /**
   * Handle Stripe webhook
   * Called when payment is completed
   */
  async handleStripeWebhook(payload: any, signature: string) {
    try {
      // Verify webhook signature
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new CustomError("Stripe webhook secret not configured", 500);
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          payload,
          signature,
          webhookSecret
        );
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        const error: any = new Error("Invalid webhook signature");
        error.code = PAYMENT_ERROR.INVALID_WEBHOOK_SIGNATURE;
        throw error;
      }

      // Handle the event
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const transactionId = session.metadata?.transactionId;
        const userId = session.metadata?.userId;

        if (!transactionId || !userId) {
          console.error("Missing metadata in webhook:", session.id);
          return;
        }

        // Process the payment
        await this.creditWallet(userId, transactionId, session.id);
      } else if (event.type === "checkout.session.expired") {
        const session = event.data.object as Stripe.Checkout.Session;
        const transactionId = session.metadata?.transactionId;

        if (transactionId) {
          await this.markTransactionFailed(transactionId, "Session expired");
        }
      }

      return { received: true };
    } catch (error: any) {
      console.error("Error handling Stripe webhook:", error);
      throw error;
    }
  }

  /**
   * Credit wallet after successful payment
   * Atomic transaction to ensure data consistency
   */
  async creditWallet(
    userId: string,
    transactionId: string,
    providerSessionId: string
  ) {
    try {
      await withTransaction(async (session) => {
        // Get payment transaction
        const paymentTransaction = await PaymentTransaction.findOne({
          transactionId,
        }).session(session);

        if (!paymentTransaction) {
          console.error("Payment transaction not found:", transactionId);
          return;
        }

        // Check if already processed
        if (paymentTransaction.status === "COMPLETED") {
          console.log("Transaction already completed:", transactionId);
          return;
        }

        // Update payment transaction
        paymentTransaction.status = "COMPLETED";
        paymentTransaction.completedAt = new Date();
        paymentTransaction.webhookReceived = true;
        paymentTransaction.webhookReceivedAt = new Date();
        paymentTransaction.providerSessionId = providerSessionId;
        await paymentTransaction.save({ session });

        // Credit user wallet
        const user = await UserModel.findById(userId).session(session);
        if (!user) {
          throw new CustomError("User not found", 404);
        }

        user.wallet.realMoneyBalance =
          Math.round(
            (user.wallet.realMoneyBalance + paymentTransaction.amount) * 100
          ) / 100;
        user.wallet.realMoneyTotalDeposited =
          Math.round(
            (user.wallet.realMoneyTotalDeposited + paymentTransaction.amount) *
              100
          ) / 100;
        user.wallet.version += 1;
        user.wallet.lastUpdated = new Date();
        await user.save({ session });

        // Create transaction log
        await Transaction.create(
          [
            {
              userId: new ObjectId(userId),
              type: "DEPOSIT",
              amount: paymentTransaction.amount,
              walletType: "REAL_MONEY",
              status: "completed",
              metadata: {
                paymentTransactionId: transactionId,
                paymentMethod: paymentTransaction.paymentMethod,
                fee: paymentTransaction.fee,
              },
            },
          ],
          { session }
        );

        console.log(
          `Wallet credited: userId=${userId}, amount=${paymentTransaction.amount}, transactionId=${transactionId}`
        );
      });

      // Emit socket event (async, non-blocking)
      this.notifyWalletUpdate(userId, transactionId).catch((err) => {
        console.error("Error notifying wallet update:", err);
      });

      // Send notification
      try {
        const paymentTransaction = await PaymentTransaction.findOne({
          transactionId,
        });
        if (paymentTransaction) {
          const notificationService =
            require("../notification/notification.service").default;
          await notificationService.sendNotification(userId, {
            type: "DEPOSIT_COMPLETED",
            title: "Deposit Completed",
            message: `$${paymentTransaction.amount.toFixed(
              2
            )} has been added to your wallet`,
            data: {
              transactionId,
              amount: paymentTransaction.amount,
              paymentMethod: paymentTransaction.paymentMethod,
            },
            priority: "HIGH",
          });
        }
      } catch (notificationError) {
        console.error("Error sending deposit notification:", notificationError);
      }
    } catch (error: any) {
      console.error("Error crediting wallet:", error);
      throw error;
    }
  }

  /**
   * Mark transaction as failed
   */
  async markTransactionFailed(transactionId: string, reason: string) {
    try {
      await PaymentTransaction.updateOne(
        { transactionId },
        {
          $set: {
            status: "FAILED",
            failureReason: reason,
            failedAt: new Date(),
          },
        }
      );
    } catch (error: any) {
      console.error("Error marking transaction failed:", error);
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(
    userId: string,
    filters: {
      type?: string;
      status?: string;
      paymentMethod?: string;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    try {
      const {
        type,
        status,
        paymentMethod,
        limit = 50,
        offset = 0,
        startDate,
        endDate,
      } = filters;

      const query: any = { userId: new ObjectId(userId) };

      if (type) query.type = type;
      if (status) query.status = status;
      if (paymentMethod) query.paymentMethod = paymentMethod;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }

      const [transactions, total] = await Promise.all([
        PaymentTransaction.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .select("-metadata -ipAddress -userAgent")
          .lean(),
        PaymentTransaction.countDocuments(query),
      ]);

      return {
        transactions: transactions.map((t) => ({
          transactionId: t.transactionId,
          type: t.type,
          amount: t.amount,
          fee: t.fee,
          netAmount: t.netAmount,
          totalAmount: t.totalAmount,
          paymentMethod: t.paymentMethod,
          status: t.status,
          timestamp: t.createdAt,
          completedAt: t.completedAt,
        })),
        total,
        hasMore: offset + limit < total,
      };
    } catch (error: any) {
      console.error("Error getting payment history:", error);
      throw new CustomError("Failed to get payment history", 500);
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(userId: string, transactionId: string) {
    try {
      const transaction = await PaymentTransaction.findOne({
        transactionId,
        userId: new ObjectId(userId),
      }).lean();

      if (!transaction) {
        const error: any = new Error("Transaction not found");
        error.code = PAYMENT_ERROR.INVALID_TRANSACTION;
        throw error;
      }

      return {
        transactionId: transaction.transactionId,
        type: transaction.type,
        amount: transaction.amount,
        fee: transaction.fee,
        netAmount: transaction.netAmount,
        totalAmount: transaction.totalAmount,
        paymentMethod: transaction.paymentMethod,
        status: transaction.status,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt,
        failedAt: transaction.failedAt,
        failureReason: transaction.failureReason,
      };
    } catch (error: any) {
      console.error("Error getting transaction:", error);
      throw error;
    }
  }

  /**
   * Helper: Get payment provider from payment method
   */
  private getProvider(
    paymentMethod: string
  ): "STRIPE" | "PAYPAL" | "GOOGLE_PAY" {
    switch (paymentMethod) {
      case PAYMENT_METHOD.CREDIT_CARD:
        return "STRIPE";
      case PAYMENT_METHOD.PAYPAL:
        return "PAYPAL";
      case PAYMENT_METHOD.GOOGLE_PAY:
        return "GOOGLE_PAY";
      default:
        return "STRIPE";
    }
  }

  /**
   * Helper: Notify user of wallet update via Socket.IO
   */
  private async notifyWalletUpdate(userId: string, transactionId: string) {
    try {
      const { io } = require("../../socket/index");
      const user = await UserModel.findById(userId).select("wallet");

      if (user) {
        io.to(userId).emit("wallet_updated", {
          type: "DEPOSIT",
          realMoneyBalance: user.wallet.realMoneyBalance,
          transactionId,
        });
      }
    } catch (error: any) {
      console.error("Error notifying wallet update:", error);
      // Don't throw - this is not critical
    }
  }
}

export default new PaymentService();
