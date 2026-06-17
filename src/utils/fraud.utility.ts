// src/utils/fraud.utility.ts

import FraudAlert from "../models/FraudDetection.model";
import AdminAuditLog from "../models/AdminAuditLog.model";
import User from "../models/User.model";
import Transaction from "../models/Transaction.model";
import Room from "../models/Room.model";

/**
 * Fraud Detection Utility
 *
 * CRITICAL: Advanced fraud prevention and detection
 */

/**
 * Detect multi-accounting (same device/IP)
 */
export async function detectMultiAccounting(
  userId: string,
  ipAddress?: string,
  deviceId?: string
): Promise<void> {
  if (!ipAddress && !deviceId) return;

  const User = require("../models/User.model").default;

  // Find other users with same IP or device
  const suspiciousUsers = await Transaction.aggregate([
    {
      $match: {
        $or: [{ ipAddress: ipAddress }, { deviceId: deviceId }].filter(
          (f) => f && Object.values(f)[0]
        ),
        userId: { $ne: userId },
      },
    },
    {
      $group: {
        _id: "$userId",
        count: { $sum: 1 },
        firstSeen: { $min: "$createdAt" },
        lastSeen: { $max: "$createdAt" },
      },
    },
    {
      $match: {
        count: { $gte: 5 }, // At least 5 transactions from same IP/device
      },
    },
  ]);

  if (suspiciousUsers.length > 0) {
    const relatedUserIds = suspiciousUsers.map((u) => u._id);

    // Create fraud alert
    await FraudAlert.create({
      userId,
      type: "MULTI_ACCOUNTING",
      severity: "HIGH",
      detectionMethod: "AUTOMATED",
      description: `Multiple accounts detected from same ${
        ipAddress ? "IP" : "device"
      }. Found ${suspiciousUsers.length} related accounts.`,
      evidence: {
        matchedBy: ipAddress ? "IP_ADDRESS" : "DEVICE_ID",
        ipAddress,
        deviceId,
        relatedAccounts: suspiciousUsers,
      },
      riskScore: 75,
      confidence: 85,
      relatedUsers: relatedUserIds,
      relatedIPAddresses: ipAddress ? [ipAddress] : [],
      relatedDeviceIds: deviceId ? [deviceId] : [],
      detectedAt: new Date(),
      ipAddress,
      deviceId,
    });

    console.warn(
      `⚠️ FRAUD ALERT: Multi-accounting detected for user ${userId}. Related users: ${relatedUserIds.length}`
    );
  }
}

/**
 * Detect suspicious betting patterns
 */
export async function detectSuspiciousPattern(
  userId: string,
  roomId: string
): Promise<void> {
  const FlipHistory = require("../models/FlipHistory.model").default;

  // Get user's flip history in this room
  const userFlips = await FlipHistory.find({
    roomId,
    matchedPlayer: userId,
  }).sort({ flipNumber: 1 });

  if (userFlips.length < 10) return; // Need sufficient data

  // Check for unusual win/loss patterns
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  for (const flip of userFlips) {
    if (flip.scoreChange > 0) {
      consecutiveWins++;
      consecutiveLosses = 0;
      maxWinStreak = Math.max(maxWinStreak, consecutiveWins);
    } else if (flip.scoreChange < 0) {
      consecutiveLosses++;
      consecutiveWins = 0;
      maxLossStreak = Math.max(maxLossStreak, consecutiveLosses);
    }
  }

  // Alert on unusual streaks (> 10)
  if (maxWinStreak > 10 || maxLossStreak > 10) {
    await FraudAlert.create({
      userId,
      roomId,
      type: "UNUSUAL_PATTERN",
      severity: maxWinStreak > 15 ? "HIGH" : "MEDIUM",
      detectionMethod: "AUTOMATED",
      description: `Unusual ${
        maxWinStreak > 10 ? "winning" : "losing"
      } streak detected: ${Math.max(maxWinStreak, maxLossStreak)} consecutive ${
        maxWinStreak > 10 ? "wins" : "losses"
      }`,
      evidence: {
        maxWinStreak,
        maxLossStreak,
        totalFlips: userFlips.length,
      },
      riskScore: Math.min(50 + maxWinStreak * 3, 95),
      confidence: 70,
      relatedRooms: [roomId],
      detectedAt: new Date(),
    });

    console.warn(
      `⚠️ FRAUD ALERT: Unusual pattern for user ${userId} in room ${roomId}`
    );
  }
}

/**
 * Detect collusion between players
 */
export async function detectCollusion(roomId: string): Promise<void> {
  const FlipHistory = require("../models/FlipHistory.model").default;
  const room = await Room.findById(roomId).populate("players.userId");

  if (!room || room.players.length < 2) return;

  // Get all flips in this room
  const flips = await FlipHistory.find({ roomId }).sort({ flipNumber: 1 });

  // Analyze score distribution
  const playerScores: Record<string, number> = {};
  for (const player of room.players) {
    const userId = player.userId.toString();
    playerScores[userId] = 0;
  }

  for (const flip of flips) {
    const playerId = flip.matchedPlayer.toString();
    if (playerScores[playerId] !== undefined) {
      playerScores[playerId] += flip.scoreChange;
    }
  }

  // Check for suspicious score distribution (one player always winning, others always losing)
  const scores = Object.values(playerScores);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const scoreDifference = maxScore - minScore;

  // Alert if score difference is extreme (> 80% of possible score range)
  const maxPossibleScore = room.gameLength * 50; // Rough estimate
  if (scoreDifference > maxPossibleScore * 0.8) {
    const winners = Object.keys(playerScores).filter(
      (id) => playerScores[id] > 0
    );
    const losers = Object.keys(playerScores).filter(
      (id) => playerScores[id] < 0
    );

    await FraudAlert.create({
      roomId,
      type: "COLLUSION",
      severity: "CRITICAL",
      detectionMethod: "AUTOMATED",
      description: `Potential collusion detected: Extreme score difference (${scoreDifference}). ${winners.length} winners vs ${losers.length} losers.`,
      evidence: {
        scores: playerScores,
        scoreDifference,
        maxPossibleScore,
      },
      riskScore: 90,
      confidence: 75,
      relatedUsers: Object.keys(playerScores),
      relatedRooms: [roomId],
      detectedAt: new Date(),
    });

    console.error(
      `🚨 FRAUD ALERT: Potential collusion detected in room ${roomId}`
    );
  }
}

/**
 * Detect rapid withdrawal attempts
 */
export async function detectRapidWithdrawal(userId: string): Promise<void> {
  // Check for multiple withdrawal attempts in short time
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const recentWithdrawals = await Transaction.countDocuments({
    userId,
    type: "WITHDRAWAL",
    createdAt: { $gte: fiveMinutesAgo },
  });

  if (recentWithdrawals >= 3) {
    await FraudAlert.create({
      userId,
      type: "RAPID_WITHDRAWAL",
      severity: "MEDIUM",
      detectionMethod: "AUTOMATED",
      description: `Rapid withdrawal attempts detected: ${recentWithdrawals} attempts in 5 minutes`,
      evidence: {
        attempts: recentWithdrawals,
        timeWindow: "5 minutes",
      },
      riskScore: 60,
      confidence: 90,
      detectedAt: new Date(),
    });

    console.warn(
      `⚠️ FRAUD ALERT: Rapid withdrawals detected for user ${userId}`
    );
  }
}

/**
 * Check user's fraud risk score
 */
export async function getUserFraudRiskScore(userId: string): Promise<{
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number;
  activeAlerts: number;
  recentAlerts: number;
  isFlagged: boolean;
}> {
  // Count active alerts
  const activeAlerts = await FraudAlert.countDocuments({
    userId,
    status: { $in: ["PENDING", "INVESTIGATING", "CONFIRMED"] },
  });

  // Count recent alerts (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentAlerts = await FraudAlert.countDocuments({
    userId,
    detectedAt: { $gte: thirtyDaysAgo },
  });

  // Calculate risk score
  let score = 0;

  if (activeAlerts > 0) {
    const alerts = await FraudAlert.find({
      userId,
      status: { $in: ["PENDING", "INVESTIGATING", "CONFIRMED"] },
    }).sort({ riskScore: -1 });

    score = Math.max(...alerts.map((a) => a.riskScore));
  }

  // Determine risk level
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (score >= 80) {
    riskLevel = "CRITICAL";
  } else if (score >= 60) {
    riskLevel = "HIGH";
  } else if (score >= 40) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "LOW";
  }

  return {
    riskLevel,
    score,
    activeAlerts,
    recentAlerts,
    isFlagged: activeAlerts > 0,
  };
}

/**
 * Log fraud action (admin)
 */
export async function logFraudAction(
  adminId: string,
  adminUsername: string,
  action: string,
  userId: string,
  alertId: string,
  ipAddress: string,
  reason?: string
): Promise<void> {
  await AdminAuditLog.create({
    adminId,
    adminUsername,
    adminRole: "ADMIN",
    action: action as any,
    category: "FRAUD_PREVENTION",
    targetUserId: userId,
    targetFraudAlertId: alertId,
    description: `Fraud action taken: ${action}`,
    reason,
    ipAddress,
    timestamp: new Date(),
    status: "SUCCESS",
  });
}

export default {
  detectMultiAccounting,
  detectSuspiciousPattern,
  detectCollusion,
  detectRapidWithdrawal,
  getUserFraudRiskScore,
  logFraudAction,
};
