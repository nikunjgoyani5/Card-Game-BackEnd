import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success, fail } from "../../utils/apiResponse.utility";
import authService from "./auth.service";
import { MESSAGES } from "../../utils/constants.utility";

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  return success(res, MESSAGES.REGISTER_SUCCESS, { ...user });
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  return success(res, MESSAGES.LOGIN_SUCCESS, data);
});

export const googleLogin = asyncHandler(async (req, res) => {
  const data = await authService.googleLogin(req.body);
  return success(res, MESSAGES.LOGIN_SUCCESS, data);
});

export const getProfile = asyncHandler(async (req, res) => {
  return success(res, MESSAGES.PROFILE_GET_SUCCESS, req.user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updated: any = await authService.updateProfile(req.user._id, req.body);
  return success(res, MESSAGES.PROFILE_UPDATE_SUCCESS, updated);
});

export const logout = asyncHandler(async (req, res) => {
  // token invalidation can be handled via blacklist or short expiry
  await authService.logout(req.user._id);
  return success(res, MESSAGES.LOGOUT_SUCCESS, {});
});
