// src/modules/game/game.validation.ts

import Joi from "joi";

/**
 * Validation schema for room ID parameter
 *
 * Used for all game endpoints that require roomId
 */
export const roomIdParamSchema = Joi.object({
  roomId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Invalid room ID format (must be MongoDB ObjectId)",
      "any.required": "Room ID is required",
    }),
});

/**
 * Validation schema for starting a game
 *
 * No body parameters needed (roomId from params, userId from JWT)
 */
export const startGameSchema = Joi.object({}).optional();

/**
 * Validation schema for flip request
 */
export const flipRequestSchema = Joi.object({
  roomId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      "string.pattern.base": "Invalid room ID format",
      "any.required": "Room ID is required",
    }),
  bidAmount: Joi.number().positive().precision(2).required().messages({
    "number.positive": "Bid amount must be positive",
    "any.required": "Bid amount is required",
  }),
});
