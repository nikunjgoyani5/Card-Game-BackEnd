import Joi from "joi";

// Validation for GET /admin/games/active
export const getActiveGamesSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

// Validation for POST /admin/players/:userId/ban
export const banPlayerSchema = Joi.object({
  userId: Joi.string().required().messages({
    "any.required": "userId is required",
    "string.empty": "userId cannot be empty",
  }),
});

export const banPlayerBodySchema = Joi.object({
  reason: Joi.string().required().max(500).messages({
    "any.required": "reason is required",
    "string.empty": "reason cannot be empty",
    "string.max": "reason cannot exceed 500 characters",
  }),
  duration: Joi.string()
    .valid("7_DAYS", "30_DAYS", "PERMANENT")
    .required()
    .messages({
      "any.only": "duration must be 7_DAYS, 30_DAYS, or PERMANENT",
      "any.required": "duration is required",
    }),
  banType: Joi.string().valid("FULL", "REAL_MONEY_ONLY").required().messages({
    "any.only": "banType must be FULL or REAL_MONEY_ONLY",
    "any.required": "banType is required",
  }),
});

// Validation for POST /admin/players/:userId/suspend
export const suspendPlayerSchema = Joi.object({
  userId: Joi.string().required(),
});

export const suspendPlayerBodySchema = Joi.object({
  reason: Joi.string().required().max(500),
  duration: Joi.number().integer().min(1).max(365).required().messages({
    "number.min": "duration must be at least 1 day",
    "number.max": "duration cannot exceed 365 days",
  }),
});

// Validation for POST /admin/players/:userId/unban
export const unbanPlayerSchema = Joi.object({
  userId: Joi.string().required(),
});

// Validation for POST /admin/refunds/issue
export const issueRefundSchema = Joi.object({
  userId: Joi.string().required().messages({
    "any.required": "userId is required",
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    "any.required": "amount is required",
    "number.positive": "amount must be positive",
  }),
  gameMode: Joi.string().valid("FREE_COIN", "REAL_MONEY").required().messages({
    "any.only": "gameMode must be FREE_COIN or REAL_MONEY",
    "any.required": "gameMode is required",
  }),
  reason: Joi.string().required().max(500).messages({
    "any.required": "reason is required",
    "string.max": "reason cannot exceed 500 characters",
  }),
  roomId: Joi.string().optional(),
  transactionId: Joi.string().optional(),
});

// Validation for GET /admin/analytics/dashboard
export const getDashboardAnalyticsSchema = Joi.object({
  period: Joi.string().valid("24h", "7d", "30d").default("24h").messages({
    "any.only": "period must be 24h, 7d, or 30d",
  }),
});

// Validation for POST /admin/disputes/resolve
export const resolveDisputeSchema = Joi.object({
  disputeId: Joi.string().required().messages({
    "any.required": "disputeId is required",
  }),
  resolution: Joi.string()
    .valid("REFUND_FULL", "REFUND_PARTIAL", "REJECT")
    .required()
    .messages({
      "any.only": "resolution must be REFUND_FULL, REFUND_PARTIAL, or REJECT",
      "any.required": "resolution is required",
    }),
  refundAmount: Joi.number()
    .positive()
    .precision(2)
    .when("resolution", {
      is: Joi.valid("REFUND_FULL", "REFUND_PARTIAL"),
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "any.required": "refundAmount is required for refund resolutions",
      "number.positive": "refundAmount must be positive",
    }),
  notes: Joi.string().required().max(1000).messages({
    "any.required": "notes are required",
    "string.max": "notes cannot exceed 1000 characters",
  }),
});

// Validation for GET /admin/players/search
export const searchPlayersSchema = Joi.object({
  query: Joi.string().min(1).max(100).optional(),
  status: Joi.string().valid("ACTIVE", "SUSPENDED", "BANNED").optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

// Validation for GET /admin/audit-logs
export const getAuditLogsSchema = Joi.object({
  adminId: Joi.string().optional(),
  action: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

// Validation for GET /admin/kyc/submissions
export const getKYCSubmissionsSchema = Joi.object({
  status: Joi.string()
    .valid("PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "EXPIRED")
    .optional(),
  level: Joi.string().valid("NONE", "BASIC", "STANDARD", "ENHANCED").optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

// Validation for POST /admin/kyc/:kycId/approve
export const approveKYCSchema = Joi.object({
  kycId: Joi.string().required().messages({
    "any.required": "kycId is required",
    "string.empty": "kycId cannot be empty",
  }),
});

export const approveKYCBodySchema = Joi.object({
  level: Joi.string()
    .valid("BASIC", "STANDARD", "ENHANCED")
    .required()
    .messages({
      "any.only": "level must be BASIC, STANDARD, or ENHANCED",
      "any.required": "level is required",
    }),
  notes: Joi.string().max(1000).optional(),
});

// Validation for POST /admin/kyc/:kycId/reject
export const rejectKYCSchema = Joi.object({
  kycId: Joi.string().required().messages({
    "any.required": "kycId is required",
    "string.empty": "kycId cannot be empty",
  }),
});

export const rejectKYCBodySchema = Joi.object({
  reason: Joi.string().required().max(500).messages({
    "any.required": "reason is required",
    "string.empty": "reason cannot be empty",
    "string.max": "reason cannot exceed 500 characters",
  }),
  notes: Joi.string().max(1000).optional(),
});
