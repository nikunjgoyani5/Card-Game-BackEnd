import Joi from "joi";

// Validation for socket chat_message event
export const sendChatMessageSchema = Joi.object({
  roomId: Joi.string().required().messages({
    "any.required": "roomId is required",
    "string.empty": "roomId cannot be empty",
  }),
  messageType: Joi.string().valid("TEXT", "QUICK_MESSAGE").required().messages({
    "any.only": "messageType must be TEXT or QUICK_MESSAGE",
    "any.required": "messageType is required",
  }),
  content: Joi.string().required().max(500).messages({
    "any.required": "content is required",
    "string.empty": "content cannot be empty",
    "string.max": "content cannot exceed 500 characters",
  }),
});

// Validation for GET /chat/history/:roomId
export const getChatHistorySchema = Joi.object({
  roomId: Joi.string().required().messages({
    "any.required": "roomId is required",
    "string.empty": "roomId cannot be empty",
  }),
});

// Validation for POST /chat/mute
export const muteUserSchema = Joi.object({
  userId: Joi.string().required().messages({
    "any.required": "userId is required",
    "string.empty": "userId cannot be empty",
  }),
  duration: Joi.number()
    .integer()
    .min(1)
    .max(10080) // Max 7 days in minutes
    .required()
    .messages({
      "any.required": "duration is required",
      "number.min": "duration must be at least 1 minute",
      "number.max": "duration cannot exceed 10080 minutes (7 days)",
    }),
  reason: Joi.string().required().max(200).messages({
    "any.required": "reason is required",
    "string.empty": "reason cannot be empty",
    "string.max": "reason cannot exceed 200 characters",
  }),
});

// Validation for POST /chat/unmute
export const unmuteUserSchema = Joi.object({
  userId: Joi.string().required().messages({
    "any.required": "userId is required",
    "string.empty": "userId cannot be empty",
  }),
});

// Validation for GET /chat/quick-messages
export const getQuickMessagesSchema = Joi.object({});

// Validation for POST /chat/direct (send direct message)
export const sendDirectMessageSchema = Joi.object({
  recipientId: Joi.string().required().messages({
    "any.required": "recipientId is required",
    "string.empty": "recipientId cannot be empty",
  }),
  messageType: Joi.string()
    .default("TEXT")
    .valid("TEXT", "QUICK_MESSAGE")
    .optional()
    .messages({
      "any.only": "messageType must be TEXT or QUICK_MESSAGE",
      "any.required": "messageType is required",
    }),
  content: Joi.string().required().max(500).messages({
    "any.required": "content is required",
    "string.empty": "content cannot be empty",
    "string.max": "content cannot exceed 500 characters",
  }),
});

// Validation for GET /chat/direct/:otherUserId
export const getDirectMessagesSchema = Joi.object({
  otherUserId: Joi.string().required().messages({
    "any.required": "otherUserId is required",
    "string.empty": "otherUserId cannot be empty",
  }),
});

// Validation for PUT /chat/read/:conversationId
export const markAsReadSchema = Joi.object({
  conversationId: Joi.string().required().messages({
    "any.required": "conversationId is required",
    "string.empty": "conversationId cannot be empty",
  }),
});
