import { Request, Response } from "express";
import paymentService from "./payment.service";
import { success, fail } from "../../utils/apiResponse.utility";
import { asyncHandler } from "../../utils/asyncHandler.utility";
import { PAYMENT_ERROR } from "../../utils/constants.utility";

/**
 * POST /api/v1/payments/deposit/initiate
 * Initiate deposit transaction
 */
export const initiateDeposit = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, returnUrl, cancelUrl } = req.body;
  const userId = req.user?._id;
  const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString();
  const userAgent = req.headers["user-agent"];

  try {
    const result = await paymentService.initiateDeposit(
      userId,
      amount,
      paymentMethod,
      returnUrl,
      cancelUrl,
      ipAddress,
      userAgent
    );

    return success(res, "Deposit initiated successfully", result);
  } catch (err: any) {
    if (err.code) {
      return fail(res, err.message, err.code);
    }
    throw err;
  }
});

/**
 * POST /api/v1/payments/webhook/stripe
 * Handle Stripe webhook
 */
export const handleStripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"] as string;
  const payload = req.body;

  try {
    const result = await paymentService.handleStripeWebhook(payload, signature);
    return res.status(200).json(result);
  } catch (err: any) {
    if (err.code) {
      return fail(res, err.message, err.code, {});
    }
    throw err;
  }
});

/**
 * GET /api/v1/payments/history
 * Get payment history
 */
export const getPaymentHistory = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { type, status, paymentMethod, limit, offset, startDate, endDate } =
    req.query;

  const filters = {
    type: type as string | undefined,
    status: status as string | undefined,
    paymentMethod: paymentMethod as string | undefined,
    limit: limit ? parseInt(limit as string) : 50,
    offset: offset ? parseInt(offset as string) : 0,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
  };

  const result = await paymentService.getPaymentHistory(userId, filters);
  return success(res, "Payment history retrieved successfully", result);
});

/**
 * GET /api/v1/payments/transaction/:transactionId
 * Get transaction details
 */
export const getTransaction = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { transactionId } = req.params;

  try {
    const result = await paymentService.getTransaction(userId, transactionId);
    return success(res, "Transaction retrieved successfully", result);
  } catch (err: any) {
    if (err.code) {
      return fail(res, err.message, err.code, {});
    }
    throw err;
  }
});
