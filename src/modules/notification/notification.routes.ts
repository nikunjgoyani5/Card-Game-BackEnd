import { Router } from "express";
import notificationController from "./notification.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  getNotificationsSchema,
  markReadSchema,
  updatePreferencesSchema,
} from "./notification.validation";

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

/**
 * GET /api/notifications
 * Get user's notifications with filters
 */
router.get(
  "/",
  validate(getNotificationsSchema),
  notificationController.getNotifications
);

/**
 * POST /api/notifications/:notificationId/read
 * Mark a specific notification as read
 */
router.post("/:notificationId/read", notificationController.markAsRead);

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post("/read-all", notificationController.markAllAsRead);

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get("/preferences", notificationController.getPreferences);

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
router.put(
  "/preferences",
  validate(updatePreferencesSchema),
  notificationController.updatePreferences
);

export default router;
