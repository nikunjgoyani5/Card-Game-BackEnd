import { Router } from "express";
import adminController from "./admin.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { role } from "../../middlewares/role.middleware";
import {
  validate,
  validateParams,
} from "../../middlewares/validation.middleware";
import {
  getActiveGamesSchema,
  banPlayerSchema,
  banPlayerBodySchema,
  unbanPlayerSchema,
  issueRefundSchema,
  getDashboardAnalyticsSchema,
  resolveDisputeSchema,
  searchPlayersSchema,
  getAuditLogsSchema,
  getKYCSubmissionsSchema,
  approveKYCSchema,
  approveKYCBodySchema,
  rejectKYCSchema,
  rejectKYCBodySchema,
} from "./admin.validation";
import { USER_TYPE } from "../../utils/constants.utility";

const router = Router();

// All admin routes require authentication and ADMIN role
const adminAuth = [authMiddleware, role([USER_TYPE.ADMIN])];

/**
 * GET /api/v1/admin/games/active
 * Get all active games
 */
router.get(
  "/games/active",
  ...adminAuth,
  validate(getActiveGamesSchema),
  adminController.getActiveGames
);

/**
 * POST /api/v1/admin/players/:userId/ban
 * Ban a player
 */
router.post(
  "/players/:userId/ban",
  ...adminAuth,
  validateParams(banPlayerSchema),
  validate(banPlayerBodySchema),
  adminController.banPlayer
);

/**
 * POST /api/v1/admin/players/:userId/unban
 * Unban a player
 */
router.post(
  "/players/:userId/unban",
  ...adminAuth,
  validateParams(unbanPlayerSchema),
  adminController.unbanPlayer
);

/**
 * POST /api/v1/admin/refunds/issue
 * Issue a manual refund
 */
router.post(
  "/refunds/issue",
  ...adminAuth,
  validate(issueRefundSchema),
  adminController.issueRefund
);

/**
 * GET /api/v1/admin/analytics/dashboard
 * Get dashboard analytics
 */
router.get(
  "/analytics/dashboard",
  ...adminAuth,
  validate(getDashboardAnalyticsSchema),
  adminController.getDashboardAnalytics
);

/**
 * POST /api/v1/admin/disputes/resolve
 * Resolve a player dispute
 */
router.post(
  "/disputes/resolve",
  ...adminAuth,
  validate(resolveDisputeSchema),
  adminController.resolveDispute
);

/**
 * GET /api/v1/admin/players/search
 * Search for players
 */
router.get(
  "/players/search",
  ...adminAuth,
  validate(searchPlayersSchema),
  adminController.searchPlayers
);

/**
 * GET /api/v1/admin/audit-logs
 * Get audit logs
 */
router.get(
  "/audit-logs",
  ...adminAuth,
  validate(getAuditLogsSchema),
  adminController.getAuditLogs
);

/**
 * GET /api/v1/admin/kyc/submissions
 * Get KYC submissions (filter by status, e.g., IN_REVIEW)
 */
router.get(
  "/kyc/submissions",
  ...adminAuth,
  validate(getKYCSubmissionsSchema),
  adminController.getKYCSubmissions
);

/**
 * POST /api/v1/admin/kyc/:kycId/approve
 * Approve a KYC submission
 */
router.post(
  "/kyc/:kycId/approve",
  ...adminAuth,
  validateParams(approveKYCSchema),
  validate(approveKYCBodySchema),
  adminController.approveKYC
);

/**
 * POST /api/v1/admin/kyc/:kycId/reject
 * Reject a KYC submission
 */
router.post(
  "/kyc/:kycId/reject",
  ...adminAuth,
  validateParams(rejectKYCSchema),
  validate(rejectKYCBodySchema),
  adminController.rejectKYC
);

export default router;
