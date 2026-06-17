import { Router } from "express";
import * as Flip from "./flip.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validateParams } from "../../middlewares/validation.middleware";
import { roomIdParamSchema } from "./flip.validation";

const router = Router();

/**
 * @route   POST /api/v1/flip/:roomId
 * @desc    Player initiates a flip
 * @access  Private (requires authentication)
 */
router.post(
  "/:roomId",
  authMiddleware,
  validateParams(roomIdParamSchema),
  Flip.playerFlip
);

/**
 * @route   GET /api/v1/flip/:roomId/history
 * @desc    Get flip history for a room
 * @access  Private
 */
router.get(
  "/:roomId/history",
  authMiddleware,
  validateParams(roomIdParamSchema),
  Flip.getFlipHistory
);

/**
 * @route   GET /api/v1/flip/:roomId/status
 * @desc    Get current flip status for a room
 * @access  Private
 */
router.get(
  "/:roomId/status",
  authMiddleware,
  validateParams(roomIdParamSchema),
  Flip.getFlipStatus
);

export default router;
