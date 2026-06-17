import Joi from "joi";
import {
  MIN_WITHDRAWAL_AMOUNT,
  WITHDRAWAL_METHOD,
} from "../../utils/constants.utility";

// Validation schema for withdrawal request
export const requestWithdrawalSchema = Joi.object({
  amount: Joi.number()
    .min(MIN_WITHDRAWAL_AMOUNT)
    .required()
    .messages({
      "number.min": `Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}`,
      "any.required": "Amount is required",
    }),
  method: Joi.string()
    .valid(...Object.values(WITHDRAWAL_METHOD))
    .required()
    .messages({
      "any.only": "Invalid withdrawal method",
      "any.required": "Withdrawal method is required",
    }),
  destination: Joi.object({
    bankAccount: Joi.object({
      accountNumber: Joi.string().required(),
      routingNumber: Joi.string().required(),
      accountHolderName: Joi.string().required(),
      bankName: Joi.string().optional(),
    }).optional(),
    paypal: Joi.object({
      email: Joi.string().email().required(),
    }).optional(),
    googleWallet: Joi.object({
      email: Joi.string().email().required(),
    }).optional(),
  })
    .required()
    .messages({
      "any.required": "Withdrawal destination is required",
    }),
});

// Validation schema for withdrawal history
export const withdrawalHistorySchema = Joi.object({
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
  method: Joi.string()
    .valid(...Object.values(WITHDRAWAL_METHOD))
    .optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

// Validation schema for getting withdrawal details
export const getWithdrawalSchema = Joi.object({
  withdrawalId: Joi.string().required().messages({
    "any.required": "Withdrawal ID is required",
  }),
});

// Validation schema for cancelling withdrawal
export const cancelWithdrawalSchema = Joi.object({
  withdrawalId: Joi.string().required().messages({
    "any.required": "Withdrawal ID is required",
  }),
});
