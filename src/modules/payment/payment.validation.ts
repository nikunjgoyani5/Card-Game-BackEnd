import Joi from "joi";
import {
  MIN_DEPOSIT_AMOUNT,
  MAX_DEPOSIT_AMOUNT,
  PAYMENT_METHOD,
} from "../../utils/constants.utility";

// Validation schema for initiating deposit
export const initiateDepositSchema = Joi.object({
  amount: Joi.number()
    .min(MIN_DEPOSIT_AMOUNT)
    .max(MAX_DEPOSIT_AMOUNT)
    .required()
    .messages({
      "number.min": `Minimum deposit amount is $${MIN_DEPOSIT_AMOUNT}`,
      "number.max": `Maximum deposit amount is $${MAX_DEPOSIT_AMOUNT}`,
      "any.required": "Amount is required",
    }),
  paymentMethod: Joi.string()
    .valid(...Object.values(PAYMENT_METHOD))
    .required()
    .messages({
      "any.only": "Invalid payment method",
      "any.required": "Payment method is required",
    }),
  returnUrl: Joi.string().uri().required().messages({
    "string.uri": "Return URL must be a valid URL",
    "any.required": "Return URL is required",
  }),
  cancelUrl: Joi.string().uri().required().messages({
    "string.uri": "Cancel URL must be a valid URL",
    "any.required": "Cancel URL is required",
  }),
});

// Validation schema for payment history query
export const paymentHistorySchema = Joi.object({
  type: Joi.string().valid("DEPOSIT", "REFUND").optional(),
  status: Joi.string()
    .valid(
      "PENDING",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
      "REFUNDED",
      "CANCELLED"
    )
    .optional(),
  paymentMethod: Joi.string()
    .valid(...Object.values(PAYMENT_METHOD))
    .optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

// Validation schema for getting transaction details
export const getTransactionSchema = Joi.object({
  transactionId: Joi.string().required().messages({
    "any.required": "Transaction ID is required",
  }),
});
