import { Router } from "express";
import {
  initiateDeposit,
  handleStripeWebhook,
  getPaymentHistory,
  getTransaction,
} from "./payment.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  initiateDepositSchema,
  paymentHistorySchema,
  getTransactionSchema,
} from "./payment.validation";

const router = Router();

/**
 * POST /api/v1/payments/deposit/initiate
 * Initiate deposit transaction
 */
router.post(
  "/deposit/initiate",
  authMiddleware,
  validate(initiateDepositSchema),
  initiateDeposit
);

/**
 * POST /api/v1/payments/webhook/stripe
 * Stripe webhook endpoint (no auth required)
 */
router.post("/webhook/stripe", handleStripeWebhook);

/**
 * GET /api/v1/payments/history
 * Get payment history
 */
router.get(
  "/history",
  authMiddleware,
  validate(paymentHistorySchema),
  getPaymentHistory
);

/**
 * GET /api/v1/payments/transaction/:transactionId
 * Get transaction details
 */
router.get("/transaction/:transactionId", authMiddleware, getTransaction);

export default router;
