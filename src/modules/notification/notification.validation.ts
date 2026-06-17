import Joi from "joi";

// Validation schema for getting notifications
export const getNotificationsSchema = Joi.object({
  unreadOnly: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  type: Joi.string()
    .valid(
      "FRIEND_REQUEST_RECEIVED",
      "FRIEND_REQUEST_ACCEPTED",
      "GAME_INVITATION",
      "GAME_REMINDER_15MIN",
      "GAME_REMINDER_5MIN",
      "FRIENDS_ONLINE",
      "DEPOSIT_COMPLETED",
      "WITHDRAWAL_COMPLETED",
      "KYC_APPROVED",
      "KYC_REJECTED",
      "NEW_FEATURE",
      "SYSTEM_ANNOUNCEMENT"
    )
    .optional(),
});

// Validation schema for marking notification as read
export const markReadSchema = Joi.object({
  notificationId: Joi.string().required().messages({
    "any.required": "Notification ID is required",
  }),
});

// Validation schema for updating preferences
export const updatePreferencesSchema = Joi.object({
  enabled: Joi.object({
    friendRequests: Joi.boolean().optional(),
    gameInvitations: Joi.boolean().optional(),
    scheduledGameReminders: Joi.boolean().optional(),
    friendsOnline: Joi.boolean().optional(),
    transactions: Joi.boolean().optional(),
    newFeatures: Joi.boolean().optional(),
    systemAnnouncements: Joi.boolean().optional(),
  }).optional(),
  quietHours: Joi.object({
    enabled: Joi.boolean().optional(),
    startTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .optional()
      .messages({
        "string.pattern.base": "Start time must be in HH:mm format",
      }),
    endTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .optional()
      .messages({
        "string.pattern.base": "End time must be in HH:mm format",
      }),
    timezone: Joi.string().optional(),
  }).optional(),
  pushEnabled: Joi.boolean().optional(),
  inAppEnabled: Joi.boolean().optional(),
});
