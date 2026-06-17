import { Request, Response } from "express";
import friendsService from "./friends.service";
import { success, fail } from "../../utils/apiResponse.utility";
import { asyncHandler } from "../../utils/asyncHandler.utility";
import { FRIEND_ERROR } from "../../utils/constants.utility";

/**
 * POST /api/v1/friends/search
 * Search for users by username or email
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { query, limit } = req.body;
  const userId = req.user?._id;

  const result = await friendsService.searchUsers(userId, query, limit);
  return success(res, "Users retrieved successfully", result);
});

/**
 * POST /api/v1/friends/request
 * Send friend request
 */
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const { friendId } = req.body;
  const userId = req.user?._id;

  try {
    const result = await friendsService.sendFriendRequest(userId, friendId);
    return success(res, "Friend request sent successfully", result);
  } catch (err: any) {
    if (err.code) {
      return fail(res, err.message, err.code, {});
    }
    throw err;
  }
});

/**
 * POST /api/v1/friends/accept
 * Accept friend request
 */
export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.body;
  const userId = req.user?._id;

  try {
    const result = await friendsService.acceptFriendRequest(userId, requestId);
    return success(res, "Friend request accepted", result);
  } catch (err: any) {
    if (err.code) {
      return fail(res, err.message, err.code, {});
    }
    throw err;
  }
});

/**
 * POST /api/v1/friends/reject
 * Reject friend request
 */
export const rejectFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.body;
  const userId = req.user?._id;

  try {
    const result = await friendsService.rejectFriendRequest(userId, requestId);
    return success(res, "Friend request rejected", result);
  } catch (err: any) {
    if (err.code) {
      return fail(res, err.message, err.code, {});
    }
    throw err;
  }
});

/**
 * DELETE /api/v1/friends/:friendId
 * Remove friend
 */
export const removeFriend = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const userId = req.user?._id;

  const result = await friendsService.removeFriend(userId, friendId);
  return success(res, "Friend removed successfully", result);
});

/**
 * GET /api/v1/friends/list
 * Get friend list with online status
 */
export const getFriendList = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const result = await friendsService.getFriendList(userId);
  return success(res, "Friend list retrieved successfully", result);
});

/**
 * GET /api/v1/friends/requests
 * Get pending friend requests (received and sent)
 */
export const getFriendRequests = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const result = await friendsService.getFriendRequests(userId);
  return success(res, "Friend requests retrieved successfully", result);
});

/**
 * GET /api/v1/friends/profile/:userId
 * View public profile of any user
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const { userId: targetUserId } = req.params;
  const currentUserId = req.user?._id;

  try {
    const result = await friendsService.getUserProfile(
      currentUserId,
      targetUserId
    );
    return success(res, "User profile retrieved successfully", result);
  } catch (err: any) {
    if (err.code) {
      return fail(res, err.message, err.code, {});
    }
    throw err;
  }
});

// ===== LEGACY ENDPOINTS (Keep for backward compatibility) =====

export const listNonFriends = asyncHandler(async (req, res) => {
  const { username } = req.query;
  const userId = req.user?._id;
  const users = await friendsService.getNonFriends(userId, username as string);
  return success(res, "users list", { users });
});

export const sendFriendInvite = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body;
  const userId = req.user?._id;
  const result = await friendsService.sendInvite(userId, targetUserId);
  return success(res, "Sent invite successfully", {});
});

export const listFriends = asyncHandler(async (req, res) => {
  const { username } = req.query;
  const userId = req.user?._id;
  const friends = await friendsService.getFriends(userId, username as string);
  return success(res, "List friends successfully", { users: friends });
});

export const listFriendRequests = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const requests = await friendsService.getFriendRequests(userId);
  return success(res, "Friend Requests successfully", requests);
});

export const handleFriendRequest = asyncHandler(async (req, res) => {
  const { requesterId, action } = req.body;
  const userId = req.user?._id;
  const result = await friendsService.handleRequest(
    userId,
    requesterId,
    action
  );
  return success(res, result, {});
});
