import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success } from "../../utils/apiResponse.utility";
import flipService from "./flip.service";

/**
 * Player initiates a flip
 * POST /flip/:roomId
 */
export const playerFlip = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const userId = req?.user?._id;

  // Validate user authentication
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not authenticated",
    });
  }

  await flipService.playerFlip(roomId, userId.toString());

  return success(res, "Card flipped successfully");
});

/**
 * Get flip history for a room
 * GET /flip/:roomId/history
 */
export const getFlipHistory = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const history = await flipService.getFlipHistory(roomId);

  return success(res, "Flip history retrieved successfully", { history });
});

/**
 * Get current flip status
 * GET /flip/:roomId/status
 */
export const getFlipStatus = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const status = await flipService.getFlipStatus(roomId);

  return success(res, "Flip status retrieved successfully", status);
});
