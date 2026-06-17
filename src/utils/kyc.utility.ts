// src/utils/kyc.utility.ts

import KYCVerification from "../models/KYCVerification.model";
import AdminAuditLog from "../models/AdminAuditLog.model";
import { WALLET_ERROR } from "./constants.utility";

/**
 * KYC Utility Functions
 *
 * LEGAL REQUIREMENT: Verify identity before withdrawals
 */

export interface WithdrawalLimitCheck {
  allowed: boolean;
  reason?: string;
  remainingDaily: number;
  remainingMonthly: number;
  remainingLifetime: number;
  currentLevel: string;
  upgradeTo?: string;
}

/**
 * Check if user can withdraw specified amount
 */
export async function canWithdraw(
  userId: string,
  amount: number
): Promise<WithdrawalLimitCheck> {
  const kyc = await KYCVerification.findOne({ userId });

  // No KYC record - user must verify
  if (!kyc) {
    return {
      allowed: false,
      reason: "KYC_REQUIRED: Identity verification required before withdrawal",
      remainingDaily: 0,
      remainingMonthly: 0,
      remainingLifetime: 0,
      currentLevel: "NONE",
      upgradeTo: "BASIC",
    };
  }

  // KYC not approved
  if (kyc.status !== "APPROVED") {
    return {
      allowed: false,
      reason: `KYC_NOT_APPROVED: KYC verification is ${kyc.status}`,
      remainingDaily: 0,
      remainingMonthly: 0,
      remainingLifetime: 0,
      currentLevel: kyc.level,
      upgradeTo: getNextLevel(kyc.level),
    };
  }

  // KYC expired
  if (kyc.expiresAt && kyc.expiresAt < new Date()) {
    return {
      allowed: false,
      reason: "KYC_EXPIRED: Verification expired, please re-verify",
      remainingDaily: 0,
      remainingMonthly: 0,
      remainingLifetime: 0,
      currentLevel: kyc.level,
      upgradeTo: kyc.level,
    };
  }

  // Calculate remaining limits
  const Transaction = require("../models/Transaction.model").default;

  // Daily limit check (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailyWithdrawals = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: "WITHDRAWAL",
        status: "COMPLETED",
        createdAt: { $gte: oneDayAgo },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);
  const dailyWithdrawn = dailyWithdrawals[0]?.total || 0;
  const remainingDaily = kyc.dailyWithdrawalLimit - dailyWithdrawn;

  // Monthly limit check (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const monthlyWithdrawals = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: "WITHDRAWAL",
        status: "COMPLETED",
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);
  const monthlyWithdrawn = monthlyWithdrawals[0]?.total || 0;
  const remainingMonthly = kyc.monthlyWithdrawalLimit - monthlyWithdrawn;

  // Lifetime limit check (all time)
  const lifetimeWithdrawals = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: "WITHDRAWAL",
        status: "COMPLETED",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);
  const lifetimeWithdrawn = lifetimeWithdrawals[0]?.total || 0;
  const remainingLifetime = kyc.lifetimeWithdrawalLimit - lifetimeWithdrawn;

  // Check if amount exceeds any limit
  if (amount > remainingDaily) {
    return {
      allowed: false,
      reason: `DAILY_LIMIT_EXCEEDED: Daily withdrawal limit reached. Limit: $${kyc.dailyWithdrawalLimit}, Withdrawn today: $${dailyWithdrawn}, Remaining: $${remainingDaily}`,
      remainingDaily,
      remainingMonthly,
      remainingLifetime,
      currentLevel: kyc.level,
      upgradeTo: getNextLevel(kyc.level),
    };
  }

  if (amount > remainingMonthly) {
    return {
      allowed: false,
      reason: `MONTHLY_LIMIT_EXCEEDED: Monthly withdrawal limit reached. Limit: $${kyc.monthlyWithdrawalLimit}, Withdrawn this month: $${monthlyWithdrawn}, Remaining: $${remainingMonthly}`,
      remainingDaily,
      remainingMonthly,
      remainingLifetime,
      currentLevel: kyc.level,
      upgradeTo: getNextLevel(kyc.level),
    };
  }

  if (amount > remainingLifetime) {
    return {
      allowed: false,
      reason: `LIFETIME_LIMIT_EXCEEDED: Lifetime withdrawal limit reached. Limit: $${kyc.lifetimeWithdrawalLimit}, Total withdrawn: $${lifetimeWithdrawn}, Remaining: $${remainingLifetime}`,
      remainingDaily,
      remainingMonthly,
      remainingLifetime,
      currentLevel: kyc.level,
      upgradeTo: getNextLevel(kyc.level),
    };
  }

  // All checks passed
  return {
    allowed: true,
    remainingDaily,
    remainingMonthly,
    remainingLifetime,
    currentLevel: kyc.level,
  };
}

/**
 * Get next verification level
 */
function getNextLevel(
  currentLevel: string
): "BASIC" | "STANDARD" | "ENHANCED" | undefined {
  switch (currentLevel) {
    case "NONE":
      return "BASIC";
    case "BASIC":
      return "STANDARD";
    case "STANDARD":
      return "ENHANCED";
    default:
      return undefined;
  }
}

/**
 * Log KYC approval (admin action)
 */
export async function logKYCApproval(
  adminId: string,
  adminUsername: string,
  userId: string,
  level: string,
  ipAddress: string,
  reason?: string
): Promise<void> {
  await AdminAuditLog.create({
    adminId,
    adminUsername,
    adminRole: "ADMIN",
    action: "KYC_APPROVE",
    category: "KYC_VERIFICATION",
    targetUserId: userId,
    description: `KYC verification approved at ${level} level`,
    newValue: { level, status: "APPROVED" },
    reason,
    ipAddress,
    timestamp: new Date(),
    status: "SUCCESS",
  });
}

/**
 * Log KYC rejection (admin action)
 */
export async function logKYCRejection(
  adminId: string,
  adminUsername: string,
  userId: string,
  rejectionReason: string,
  ipAddress: string
): Promise<void> {
  await AdminAuditLog.create({
    adminId,
    adminUsername,
    adminRole: "ADMIN",
    action: "KYC_REJECT",
    category: "KYC_VERIFICATION",
    targetUserId: userId,
    description: `KYC verification rejected: ${rejectionReason}`,
    newValue: { status: "REJECTED", rejectionReason },
    reason: rejectionReason,
    ipAddress,
    timestamp: new Date(),
    status: "SUCCESS",
  });
}

/**
 * Check if user's KYC is valid and not expired
 */
export async function isKYCValid(userId: string): Promise<boolean> {
  const kyc = await KYCVerification.findOne({ userId });

  if (!kyc || kyc.status !== "APPROVED") {
    return false;
  }

  if (kyc.expiresAt && kyc.expiresAt < new Date()) {
    return false;
  }

  return true;
}

/**
 * Get KYC status summary
 */
export async function getKYCStatus(userId: string): Promise<{
  verified: boolean;
  level: string;
  status: string;
  canWithdraw: boolean;
  withdrawalLimits: {
    daily: number;
    monthly: number;
    lifetime: number;
  };
  expiresAt?: Date;
}> {
  const kyc = await KYCVerification.findOne({ userId });

  if (!kyc) {
    return {
      verified: false,
      level: "NONE",
      status: "NOT_STARTED",
      canWithdraw: false,
      withdrawalLimits: {
        daily: 0,
        monthly: 0,
        lifetime: 0,
      },
    };
  }

  const isExpired = kyc.expiresAt && kyc.expiresAt < new Date();

  return {
    verified: kyc.status === "APPROVED" && !isExpired,
    level: kyc.level,
    status: isExpired ? "EXPIRED" : kyc.status,
    canWithdraw: kyc.status === "APPROVED" && !isExpired,
    withdrawalLimits: {
      daily: kyc.dailyWithdrawalLimit,
      monthly: kyc.monthlyWithdrawalLimit,
      lifetime: kyc.lifetimeWithdrawalLimit,
    },
    expiresAt: kyc.expiresAt,
  };
}

export default {
  canWithdraw,
  isKYCValid,
  getKYCStatus,
  logKYCApproval,
  logKYCRejection,
};
