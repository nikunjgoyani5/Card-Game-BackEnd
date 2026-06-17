// src/modules/game/flipRequest.validation.ts
import Joi from "joi";

/**
 * Validation schema for flip request
 */
export const flipRequestSchema = Joi.object({
  roomId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      "string.pattern.base":
        "Invalid room ID format (must be MongoDB ObjectId)",
      "any.required": "Room ID is required",
    }),
  bidAmount: Joi.number()
    .positive()
    .min(0.01)
    .max(10000)
    .precision(2)
    .required()
    .messages({
      "number.base": "Bid amount must be a number",
      "number.positive": "Bid amount must be positive",
      "number.min": "Bid amount must be at least $0.01",
      "number.max": "Bid amount cannot exceed $10,000",
      "number.precision": "Bid amount can only have 2 decimal places",
      "any.required": "Bid amount is required",
    }),
});

/**
 * Validation schema for getting active flip request
 */
export const activeFlipRequestParamSchema = Joi.object({
  roomId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Invalid room ID format (must be MongoDB ObjectId)",
      "any.required": "Room ID is required",
    }),
});
