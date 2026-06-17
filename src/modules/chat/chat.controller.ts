import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success, fail } from "../../utils/apiResponse.utility";
import chatService from "./chat.service";

class ChatController {
  /**
   * GET /api/v1/chat/history/:roomId
   * Get chat history for a room
   */
  getChatHistory = asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { limit = 50 } = req.query;

    const messages = await chatService.getChatHistory(
      roomId,
      parseInt(limit as string)
    );

    return success(res, "Chat history retrieved successfully", messages);
  });

  /**
   * POST /api/v1/chat/mute
   * Mute a user (admin only)
   */
  muteUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId, duration, reason } = req.body;
    const adminId = (req as any).user?._id;

    await chatService.muteUser(userId, duration, reason, adminId);

    return success(res, "User muted successfully", {
      userId,
      duration,
      reason,
    });
  });

  /**
   * POST /api/v1/chat/unmute
   * Unmute a user (admin only)
   */
  unmuteUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;

    await chatService.unmuteUser(userId);

    return success(res, "User unmuted successfully", { userId });
  });

  /**
   * GET /api/v1/chat/quick-messages
   * Get list of quick messages
   */
  getQuickMessages = asyncHandler(async (req: Request, res: Response) => {
    const quickMessages = chatService.getQuickMessages();

    return success(res, "Quick messages retrieved successfully", quickMessages);
  });

  /**
   * GET /api/v1/chat/mute-status/:userId
   * Check if a user is muted
   */
  getMuteStatus = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const muteStatus = await chatService.isUserMuted(userId);

    return success(res, "Mute status retrieved successfully", muteStatus);
  });

  /**
   * POST /api/v1/chat/direct
   * Send a direct message to another user
   */
  sendDirectMessage = asyncHandler(async (req: Request, res: Response) => {
    const senderId = (req as any).user?._id;
    const senderUsername = (req as any).user?.username;
    const { recipientId, messageType = "TEXT", content } = req.body;

    const message = await chatService.sendDirectMessage(
      senderId,
      senderUsername,
      recipientId,
      messageType,
      content
    );

    return success(res, "Direct message sent successfully", message);
  });

  /**
   * GET /api/v1/chat/direct/:otherUserId
   * Get direct message history with another user
   */
  getDirectMessages = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { otherUserId } = req.params;
    const { limit = 50 } = req.query;

    const messages = await chatService.getDirectMessageHistory(
      userId,
      otherUserId,
      parseInt(limit as string)
    );

    return success(res, "Direct messages retrieved successfully", messages);
  });

  /**
   * GET /api/v1/chat/conversations
   * Get list of conversations for authenticated user
   */
  getConversations = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;

    const conversations = await chatService.getConversationList(userId);

    return success(res, "Conversations retrieved successfully", conversations);
  });

  /**
   * PUT /api/v1/chat/read/:conversationId
   * Mark messages in a conversation as read
   */
  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { conversationId } = req.params;

    await chatService.markMessagesAsRead(conversationId, userId);

    return success(res, "Messages marked as read", { conversationId });
  });

  /**
   * GET /api/v1/chat/unread-count
   * Get unread message count for authenticated user
   */
  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;

    const count = await chatService.getUnreadCount(userId);

    return success(res, "Unread count retrieved successfully", { count });
  });
}

export default new ChatController();
