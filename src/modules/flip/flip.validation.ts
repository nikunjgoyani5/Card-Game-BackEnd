// src/modules/flip/flip.validation.ts
import Joi from "joi";

/**
 * Validation schema for roomId parameter
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
 * Validation schema for player flip action
 * No body needed, just roomId in params
 */
export const playerFlipSchema = Joi.object({}).optional();
