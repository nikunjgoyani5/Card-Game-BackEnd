import { Router } from "express";
import chatController from "./chat.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { role } from "../../middlewares/role.middleware";
import {
  validate,
  validateParams,
} from "../../middlewares/validation.middleware";
import {
  getChatHistorySchema,
  muteUserSchema,
  unmuteUserSchema,
  sendDirectMessageSchema,
  getDirectMessagesSchema,
  markAsReadSchema,
} from "./chat.validation";
import { USER_TYPE } from "../../utils/constants.utility";

const router = Router();

/**
 * GET /api/v1/chat/history/:roomId
 * Get chat history for a room (requires authentication)
 */
router.get(
  "/history/:roomId",
  authMiddleware,
  validateParams(getChatHistorySchema),
  chatController.getChatHistory
);

/**
 * POST /api/v1/chat/mute
 * Mute a user (admin only)
 */
router.post(
  "/mute",
  authMiddleware,
  role([USER_TYPE.ADMIN]),
  validate(muteUserSchema),
  chatController.muteUser
);

/**
 * POST /api/v1/chat/unmute
 * Unmute a user (admin only)
 */
router.post(
  "/unmute",
  authMiddleware,
  role([USER_TYPE.ADMIN]),
  validate(unmuteUserSchema),
  chatController.unmuteUser
);

/**
 * GET /api/v1/chat/quick-messages
 * Get list of predefined quick messages (public)
 */
router.get("/quick-messages", chatController.getQuickMessages);

/**
 * GET /api/v1/chat/mute-status/:userId
 * Check if a user is muted (admin only)
 */
router.get(
  "/mute-status/:userId",
  authMiddleware,
  role([USER_TYPE.ADMIN]),
  chatController.getMuteStatus
);

/**
 * POST /api/v1/chat/direct
 * Send a direct message to another user (requires authentication)
 */
router.post(
  "/direct",
  authMiddleware,
  validate(sendDirectMessageSchema),
  chatController.sendDirectMessage
);

/**
 * GET /api/v1/chat/direct/:otherUserId
 * Get direct message history with another user (requires authentication)
 */
router.get(
  "/direct/:otherUserId",
  authMiddleware,
  validateParams(getDirectMessagesSchema),
  chatController.getDirectMessages
);

/**
 * GET /api/v1/chat/conversations
 * Get list of conversations for authenticated user (requires authentication)
 */
router.get("/conversations", authMiddleware, chatController.getConversations);

/**
 * PUT /api/v1/chat/read/:conversationId
 * Mark messages in a conversation as read (requires authentication)
 */
router.put(
  "/read/:conversationId",
  authMiddleware,
  validateParams(markAsReadSchema),
  chatController.markAsRead
);

/**
 * GET /api/v1/chat/unread-count
 * Get unread message count for authenticated user (requires authentication)
 */
router.get("/unread-count", authMiddleware, chatController.getUnreadCount);

export default router;
