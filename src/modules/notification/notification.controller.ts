import { Request, Response } from "express";
import notificationService from "./notification.service";
import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success, fail } from "../../utils/apiResponse.utility";

class NotificationController {
  /**
   * Get user's notifications
   * GET /api/notifications
   */
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { unreadOnly, type, limit, offset } = req.query;

    const filters = {
      unreadOnly: unreadOnly,
      type: type as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    console.log("unreadOnly", unreadOnly, typeof unreadOnly);
    //@ts-ignore
    const result = await notificationService.getNotifications(userId, filters);

    return success(res, "Notifications retrieved successfully", result.data);
  });

  /**
   * Mark notification as read
   * POST /api/notifications/:notificationId/read
   */
  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { notificationId } = req.params;

    await notificationService.markAsRead(userId, notificationId);

    return success(res, "Notification marked as read");
  });

  /**
   * Mark all notifications as read
   * POST /api/notifications/read-all
   */
  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;

    const result = await notificationService.markAllAsRead(userId);

    return success(res, "All notifications marked as read", {
      markedCount: result.markedCount,
    });
  });

  /**
   * Get notification preferences
   * GET /api/notifications/preferences
   */
  getPreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;

    const result = await notificationService.getPreferences(userId);

    return success(res, "Preferences retrieved successfully", result.data);
  });

  /**
   * Update notification preferences
   * PUT /api/notifications/preferences
   */
  updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const updates = req.body;

    await notificationService.updatePreferences(userId, updates);

    return success(res, "Preferences updated successfully");
  });
}

export default new NotificationController();
