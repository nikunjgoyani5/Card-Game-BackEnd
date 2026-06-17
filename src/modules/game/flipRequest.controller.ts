import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success } from "../../utils/apiResponse.utility";
import flipRequestService from "./flipRequest.service";

/**
 * Process flip request
 * POST /game/flip-request
 */
export const requestFlip = asyncHandler(async (req, res) => {
  const { roomId, bidAmount } = req.body;
  const userId = req?.user?._id;

  // Validate user authentication
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not authenticated",
    });
  }

  // Validate bidAmount is a valid number
  const parsedBidAmount = parseFloat(bidAmount);
  if (isNaN(parsedBidAmount) || parsedBidAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid bid amount",
    });
  }

  const result = await flipRequestService.processFlipRequest(
    roomId,
    userId.toString(),
    parsedBidAmount
  );

  return success(res, "Flip request placed successfully", result);
});

/**
 * Get active flip request for a room
 * GET /game/flip-request/:roomId
 */
export const getActiveFlipRequest = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const request = await flipRequestService.getActiveFlipRequest(roomId);

  if (!request) {
    return success(res, "No active flip request", { activeRequest: null });
  }

  return success(res, "Active flip request retrieved", {
    activeRequest: request,
  });
});
