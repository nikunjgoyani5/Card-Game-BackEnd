import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success, fail } from "../../utils/apiResponse.utility";
import adminService from "./admin.service";

class AdminController {
  /**
   * GET /api/v1/admin/games/active
   * Get all active games
   */
  getActiveGames = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 50, offset = 0 } = req.query;

    const result = await adminService.getActiveGames(
      parseInt(limit as string),
      parseInt(offset as string)
    );

    return success(res, "Active games retrieved successfully", result);
  });

  /**
   * POST /api/v1/admin/players/:userId/ban
   * Ban a player
   */
  banPlayer = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { reason, duration, banType } = req.body;
    const adminId = (req as any).user?._id;
    const adminUsername = (req as any).user?.username || "Admin";
    const ipAddress = req.ip || "unknown";
    const userAgent = req.get("user-agent");

    const result = await adminService.banPlayer(
      userId,
      reason,
      duration,
      banType,
      adminId,
      adminUsername,
      ipAddress,
      userAgent
    );

    return success(res, "Player banned successfully", result);
  });

  /**
   * POST /api/v1/admin/players/:userId/unban
   * Unban a player
   */
  unbanPlayer = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const adminId = (req as any).user?._id;
    const adminUsername = (req as any).user?.username || "Admin";
    const ipAddress = req.ip || "unknown";
    const userAgent = req.get("user-agent");

    const result = await adminService.unbanPlayer(
      userId,
      adminId,
      adminUsername,
      ipAddress,
      userAgent
    );

    return success(res, "Player unbanned successfully", result);
  });

  /**
   * POST /api/v1/admin/refunds/issue
   * Issue a manual refund
   */
  issueRefund = asyncHandler(async (req: Request, res: Response) => {
    const { userId, amount, gameMode, reason, roomId, transactionId } =
      req.body;
    const adminId = (req as any).user?._id;
    const adminUsername = (req as any).user?.username || "Admin";
    const ipAddress = req.ip || "unknown";
    const userAgent = req.get("user-agent");

    const result = await adminService.issueRefund(
      userId,
      amount,
      gameMode,
      reason,
      roomId,
      transactionId,
      adminId,
      adminUsername,
      ipAddress,
      userAgent
    );

    return success(res, "Refund issued successfully", result);
  });

  /**
   * GET /api/v1/admin/analytics/dashboard
   * Get dashboard analytics
   */
  getDashboardAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { period = "24h" } = req.query;

    const analytics = await adminService.getDashboardAnalytics(
      period as string
    );

    return success(res, "Analytics retrieved successfully", analytics);
  });

  /**
   * POST /api/v1/admin/disputes/resolve
   * Resolve a dispute (placeholder - requires dispute model)
   */
  resolveDispute = asyncHandler(async (req: Request, res: Response) => {
    const { disputeId, resolution, refundAmount, notes } = req.body;
    const adminId = (req as any).user?._id;

    // For now, if resolution involves refund, issue the refund
    // This is a simplified implementation - full dispute system would need a Dispute model
    if (resolution === "REFUND_FULL" || resolution === "REFUND_PARTIAL") {
      // This would typically fetch dispute details from a Dispute model
      // For now, return a placeholder response
      return success(res, "Dispute resolved successfully", {
        disputeId,
        resolution,
        resolvedBy: adminId,
        resolvedAt: new Date(),
        notes,
      });
    }

    return success(res, "Dispute rejected", {
      disputeId,
      resolution: "REJECT",
      resolvedBy: adminId,
      resolvedAt: new Date(),
      notes,
    });
  });

  /**
   * GET /api/v1/admin/players/search
   * Search for players
   */
  searchPlayers = asyncHandler(async (req: Request, res: Response) => {
    const { query, status, limit = 20, offset = 0 } = req.query;

    const result = await adminService.searchPlayers(
      query as string | undefined,
      status as string | undefined,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    return success(res, "Players retrieved successfully", result);
  });

  /**
   * GET /api/v1/admin/audit-logs
   * Get audit logs
   */
  getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const {
      adminId,
      action,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const result = await adminService.getAuditLogs(
      adminId as string | undefined,
      action as string | undefined,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    return success(res, "Audit logs retrieved successfully", result);
  });

  /**
   * GET /api/v1/admin/kyc/submissions
   * Get KYC submissions
   */
  getKYCSubmissions = asyncHandler(async (req: Request, res: Response) => {
    const { status, level, limit = 50, offset = 0 } = req.query;

    const result = await adminService.getKYCSubmissions(
      status as string | undefined,
      level as string | undefined,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    return success(res, "KYC submissions retrieved successfully", result);
  });

  /**
   * POST /api/v1/admin/kyc/:kycId/approve
   * Approve a KYC submission
   */
  approveKYC = asyncHandler(async (req: Request, res: Response) => {
    const { kycId } = req.params;
    const { level, notes } = req.body;
    const adminId = (req as any).user?._id;
    const adminUsername = (req as any).user?.username || "Admin";
    const ipAddress = req.ip || "unknown";
    const userAgent = req.get("user-agent");

    const result = await adminService.approveKYC(
      kycId,
      level,
      notes,
      adminId,
      adminUsername,
      ipAddress,
      userAgent
    );

    return success(res, "KYC approved successfully", result);
  });

  /**
   * POST /api/v1/admin/kyc/:kycId/reject
   * Reject a KYC submission
   */
  rejectKYC = asyncHandler(async (req: Request, res: Response) => {
    const { kycId } = req.params;
    const { reason, notes } = req.body;
    const adminId = (req as any).user?._id;
    const adminUsername = (req as any).user?.username || "Admin";
    const ipAddress = req.ip || "unknown";
    const userAgent = req.get("user-agent");

    const result = await adminService.rejectKYC(
      kycId,
      reason,
      notes,
      adminId,
      adminUsername,
      ipAddress,
      userAgent
    );

    return success(res, "KYC rejected successfully", result);
  });
}

export default new AdminController();
