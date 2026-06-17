import { Router } from "express";
import withdrawalController from "./withdrawal.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  requestWithdrawalSchema,
  withdrawalHistorySchema,
  getWithdrawalSchema,
  cancelWithdrawalSchema,
} from "./withdrawal.validation";

const router = Router();

// All withdrawal routes require authentication
router.use(authMiddleware);

/**
 * POST /api/withdrawals/request
 * Request a withdrawal
 */
router.post(
  "/request",
  validate(requestWithdrawalSchema),
  withdrawalController.requestWithdrawal
);

/**
 * GET /api/withdrawals/history
 * Get withdrawal history with filters
 */
router.get(
  "/history",
  validate(withdrawalHistorySchema),
  withdrawalController.getWithdrawalHistory
);

/**
 * GET /api/withdrawals/:withdrawalId
 * Get withdrawal details
 */
router.get("/:withdrawalId", withdrawalController.getWithdrawal);

/**
 * POST /api/withdrawals/:withdrawalId/cancel
 * Cancel a pending withdrawal
 */
router.post("/:withdrawalId/cancel", withdrawalController.cancelWithdrawal);

export default router;
