import Joi from "joi";

// Validation for GET /leaderboard/global
export const getGlobalLeaderboardSchema = Joi.object({
  gameMode: Joi.string()
    .valid("FREE_COIN", "REAL_MONEY")
    .default("REAL_MONEY")
    .messages({
      "any.only": "gameMode must be either FREE_COIN or REAL_MONEY",
    }),
  period: Joi.string()
    .valid("DAILY", "WEEKLY", "MONTHLY", "ALL_TIME")
    .default("WEEKLY")
    .messages({
      "any.only": "period must be DAILY, WEEKLY, MONTHLY, or ALL_TIME",
    }),
  limit: Joi.number().integer().min(1).max(1000).default(100).messages({
    "number.min": "limit must be at least 1",
    "number.max": "limit cannot exceed 1000",
  }),
  offset: Joi.number().integer().min(0).default(0).messages({
    "number.min": "offset must be at least 0",
  }),
});

// Validation for GET /leaderboard/friends
export const getFriendsLeaderboardSchema = Joi.object({
  gameMode: Joi.string().valid("FREE_COIN", "REAL_MONEY").default("REAL_MONEY"),
  period: Joi.string()
    .valid("DAILY", "WEEKLY", "MONTHLY", "ALL_TIME")
    .default("ALL_TIME"),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0),
});

// Validation for GET /stats/player/:userId
export const getPlayerStatsSchema = Joi.object({
  userId: Joi.string().required().messages({
    "any.required": "userId is required",
    "string.empty": "userId cannot be empty",
  }),
});
