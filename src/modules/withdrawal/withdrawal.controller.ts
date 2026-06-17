import { Request, Response } from "express";
import withdrawalService from "./withdrawal.service";
import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success, fail } from "../../utils/apiResponse.utility";
import { WITHDRAWAL_ERROR } from "../../utils/constants.utility";

class WithdrawalController {
  /**
   * Request withdrawal
   * POST /api/withdrawals/request
   */
  requestWithdrawal = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { amount, method, destination } = req.body;

    const result = await withdrawalService.requestWithdrawal(
      userId,
      amount,
      method,
      destination
    );

    return success(
      res,
      "Withdrawal request submitted successfully",
      result.data
    );
  });

  /**
   * Get withdrawal history
   * GET /api/withdrawals/history
   */
  getWithdrawalHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { status, method, limit, offset, startDate, endDate } = req.query;

    const filters = {
      status: status as string,
      method: method as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const result = await withdrawalService.getWithdrawalHistory(
      userId,
      filters
    );

    return success(
      res,
      "Withdrawal history retrieved successfully",
      result.data
    );
  });

  /**
   * Get withdrawal details
   * GET /api/withdrawals/:withdrawalId
   */
  getWithdrawal = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { withdrawalId } = req.params;

    const result = await withdrawalService.getWithdrawal(userId, withdrawalId);

    if (!result.success) {
      return fail(res, "Withdrawal not found", 404);
    }

    return success(res, "Withdrawal retrieved successfully", result.data);
  });

  /**
   * Cancel withdrawal
   * POST /api/withdrawals/:withdrawalId/cancel
   */
  cancelWithdrawal = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { withdrawalId } = req.params;

    const result = await withdrawalService.cancelWithdrawal(
      userId,
      withdrawalId
    );

    return success(res, result.message);
  });
}

export default new WithdrawalController();
