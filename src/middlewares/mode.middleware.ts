import { Request, Response, NextFunction } from "express";
import modeService from "../modules/mode/mode.service";
import { MODE_ERROR } from "../utils/constants.utility";

/**
 * Middleware to ensure user has selected a game mode
 * Use this middleware on routes that require mode selection (like room creation/joining)
 */
export const requireModeSelection = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        code: "AUTH_001",
      });
    }

    // Check if user has selected a mode
    try {
      const modeData = await modeService.getCurrentMode(userId);

      // Attach mode to request for use in controllers
      req.currentMode = modeData.mode;
      req.inGame = modeData.inGame;

      next();
    } catch (error: any) {
      if (error.message.includes(MODE_ERROR.NO_MODE_SELECTED)) {
        return res.status(400).json({
          success: false,
          error: "No game mode selected. Please select a mode first.",
          code: MODE_ERROR.NO_MODE_SELECTED,
        });
      }
      throw error;
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "SERVER_001",
    });
  }
};

/**
 * Middleware to validate mode matches room mode
 * Use this when user tries to join a room
 */
export const validateModeForRoom = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const currentMode = req.currentMode;
  const roomMode = req.body.walletType || req.room?.walletType;

  if (currentMode && roomMode && currentMode !== roomMode) {
    return res.status(400).json({
      success: false,
      error: `Cannot join this room. Your mode is ${currentMode} but room requires ${roomMode}`,
      code: "MODE_004",
    });
  }

  next();
};
