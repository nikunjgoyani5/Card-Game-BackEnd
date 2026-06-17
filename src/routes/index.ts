import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import roomRoutes from "../modules/room/room.routes";
import walletRoutes from "../modules/wallet/wallet.routes";
import friendsRoutes from "../modules/friends/friends.routes";
import modeRoutes from "../modules/mode/mode.routes";
import gameRoutes from "../modules/game/game.routes";
import flipRoutes from "../modules/flip/flip.routes";
import paymentRoutes from "../modules/payment/payment.routes";
import withdrawalRoutes from "../modules/withdrawal/withdrawal.routes";
import kycRoutes from "../modules/kyc/kyc.routes";
import notificationRoutes from "../modules/notification/notification.routes";
import leaderboardRoutes from "../modules/leaderboard/leaderboard.routes";
import chatRoutes from "../modules/chat/chat.routes";
import adminRoutes from "../modules/admin/admin.routes";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Core routes
router.use("/auth", authRoutes);
router.use("/modes", authMiddleware, modeRoutes);
router.use("/room", roomRoutes);
router.use("/wallet", authMiddleware, walletRoutes);
router.use("/game", gameRoutes);
router.use("/flip", flipRoutes);

// Phase 3 routes - Payment & Withdrawal System
router.use("/payments", paymentRoutes); // Includes webhook (no auth)
router.use("/withdrawals", withdrawalRoutes); // Auth required (handled in routes file)
router.use("/kyc", kycRoutes); // Mixed auth (webhooks excluded)
router.use("/notifications", notificationRoutes); // Auth required

// Feature 14 routes - Leaderboards & Statistics
router.use("/leaderboard", leaderboardRoutes); // Mixed auth (global is public, friends require auth)

// Feature 15 routes - Lobby Chat System
router.use("/chat", chatRoutes); // Mixed auth (handled in routes file)

// Feature 16 routes - Admin Panel & Monitoring
router.use("/admin", adminRoutes); // Admin only (ADMIN or SUPER_ADMIN role required)

router.use("/friends", friendsRoutes);
export default router;
