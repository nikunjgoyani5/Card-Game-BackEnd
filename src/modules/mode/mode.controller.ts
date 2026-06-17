import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success } from "../../utils/apiResponse.utility";
import modeService from "./mode.service";

// Select game mode
export const selectMode = asyncHandler(async (req: any, res) => {
  const { mode } = req.body;
  const data = await modeService.selectMode(req.user._id, mode);
  return success(res, "Game mode selected successfully", data);
});

// Get current mode
export const getCurrentMode = asyncHandler(async (req: any, res) => {
  const data = await modeService.getCurrentMode(req.user._id);
  return success(res, "Current mode retrieved successfully", data);
});

// Refresh mode session
export const refreshModeSession = asyncHandler(async (req: any, res) => {
  await modeService.refreshModeSession(req.user._id);
  return success(res, "Mode session refreshed successfully", {});
});
