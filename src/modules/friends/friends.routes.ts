import { Router } from "express";
import {
  // Phase 3 controllers
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriendList,
  getFriendRequests,
  getUserProfile,
  // Legacy controllers
  listNonFriends,
  sendFriendInvite,
  listFriends,
  listFriendRequests,
  handleFriendRequest,
} from "./friends.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  // Phase 3 validation schemas
  searchUsersSchema,
  sendFriendRequestSchema,
  acceptFriendRequestSchema,
  rejectFriendRequestSchema,
  removeFriendSchema,
  getFriendProfileSchema,
  // Legacy schemas
  handleRequestSchema,
  sendInviteSchema,
  usernameSchema,
} from "./friends.validation";

const router = Router();

// ===== PHASE 3 ROUTES =====

/**
 * POST /api/v1/friends/search
 * Search for users by username or email
 */
router.post(
  "/search",
  authMiddleware,
  validate(searchUsersSchema),
  searchUsers
);

/**
 * POST /api/v1/friends/request
 * Send friend request
 */
router.post(
  "/request",
  authMiddleware,
  validate(sendFriendRequestSchema),
  sendFriendRequest
);

/**
 * POST /api/v1/friends/accept
 * Accept friend request
 */
router.post(
  "/accept",
  authMiddleware,
  validate(acceptFriendRequestSchema),
  acceptFriendRequest
);

/**
 * POST /api/v1/friends/reject
 * Reject friend request
 */
router.post(
  "/reject",
  authMiddleware,
  validate(rejectFriendRequestSchema),
  rejectFriendRequest
);

/**
 * DELETE /api/v1/friends/:friendId
 * Remove friend
 */
router.delete("/:friendId", authMiddleware, removeFriend);

/**
 * GET /api/v1/friends/list
 * Get friend list with online status
 */
router.get("/list", authMiddleware, getFriendList);

/**
 * GET /api/v1/friends/requests
 * Get pending friend requests (received and sent)
 */
router.get("/requests", authMiddleware, getFriendRequests);

/**
 * GET /api/v1/friends/profile/:userId
 * View public profile of any user
 */
router.get("/profile/:userId", authMiddleware, getUserProfile);

// ===== LEGACY ROUTES (Keep for backward compatibility) =====

router.get(
  "/non-friends",
  authMiddleware,
  validate(usernameSchema),
  listNonFriends
);
router.post(
  "/send-invite",
  authMiddleware,
  validate(sendInviteSchema),
  sendFriendInvite
);
router.get("/friends", authMiddleware, validate(usernameSchema), listFriends);
router.get("/friend-requests", authMiddleware, listFriendRequests);
router.post(
  "/handle-request",
  authMiddleware,
  validate(handleRequestSchema),
  handleFriendRequest
);

export default router;
