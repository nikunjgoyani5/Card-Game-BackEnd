import { Router } from "express";
import * as Room from "./room.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireModeSelection } from "../../middlewares/mode.middleware";
import {
  validate,
  validateParams,
} from "../../middlewares/validation.middleware";
import {
  joinRoomSchema,
  roomIdSchema,
  roomPublicSchema,
  roomSchema,
  scheduleRoomSchema,
} from "./room.validation";

const router = Router();

// Create room
router.post(
  "/create",
  authMiddleware,
  requireModeSelection,
  validate(roomSchema),
  Room.createRoom
);

// Legacy create endpoint (kept for compatibility)
router.post(
  "/",
  authMiddleware,
  requireModeSelection,
  validate(roomSchema),
  Room.createRoom
);

// Join room (supports MATCHMAKING, ROOM_CODE, INVITATION methods)
router.post(
  "/join",
  authMiddleware,
  requireModeSelection,
  validate(joinRoomSchema),
  Room.joinRoom
);

// Schedule room
router.post(
  "/schedule",
  authMiddleware,
  requireModeSelection,
  validate(scheduleRoomSchema),
  Room.scheduleRoom
);

// List available rooms
router.get(
  "/list",
  authMiddleware,
  requireModeSelection,
  validate(roomPublicSchema),
  Room.listRooms
);

// Get public rooms (legacy)
router.get(
  "/public",
  authMiddleware,
  requireModeSelection,
  validate(roomPublicSchema),
  Room.getPublicRooms
);

// Get room by ID
router.get(
  "/:id",
  authMiddleware,
  validateParams(roomIdSchema),
  Room.getRoomById
);

export default router;
