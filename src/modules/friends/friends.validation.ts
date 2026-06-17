import Joi from "joi";

// Validation schema for searching users
export const searchUsersSchema = Joi.object({
  query: Joi.string().min(1).max(50).required().trim().messages({
    "string.empty": "Search query is required",
    "string.min": "Search query must be at least 1 character",
    "string.max": "Search query cannot exceed 50 characters",
  }),
  limit: Joi.number().integer().min(1).max(50).default(20).messages({
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 50",
  }),
});

// Validation schema for sending friend request
export const sendFriendRequestSchema = Joi.object({
  friendId: Joi.string().required().trim().messages({
    "string.empty": "Friend ID is required",
    "any.required": "Friend ID is required",
  }),
});

// Validation schema for accepting friend request
export const acceptFriendRequestSchema = Joi.object({
  requestId: Joi.string().required().trim().messages({
    "string.empty": "Request ID is required",
    "any.required": "Request ID is required",
  }),
});

// Validation schema for rejecting friend request
export const rejectFriendRequestSchema = Joi.object({
  requestId: Joi.string().required().trim().messages({
    "string.empty": "Request ID is required",
    "any.required": "Request ID is required",
  }),
});

// Validation schema for removing friend
export const removeFriendSchema = Joi.object({
  friendId: Joi.string().required().trim().messages({
    "string.empty": "Friend ID is required",
    "any.required": "Friend ID is required",
  }),
});

// Validation schema for getting friend profile
export const getFriendProfileSchema = Joi.object({
  userId: Joi.string().required().trim().messages({
    "string.empty": "User ID is required",
    "any.required": "User ID is required",
  }),
});

// Validation schema for pagination
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 100",
  }),
});

// Legacy schemas (keep for backward compatibility)
export const usernameSchema = Joi.object({
  username: Joi.string().optional(),
});
export const sendInviteSchema = Joi.object({
  targetUserId: Joi.string().required(),
});
export const handleRequestSchema = Joi.object({
  action: Joi.string().required(),
  requesterId: Joi.string().required(),
});
