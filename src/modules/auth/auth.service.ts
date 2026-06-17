import User from "../../models/User.model";
import bcrypt from "bcryptjs";
import { generateToken } from "../../utils/jwt.utility";
import { generateUniqueUsername } from "../../utils/user.utility";
import {
  FREE_WALLET_TOPUP,
  MESSAGES,
  REAL_WALLET_TOPUP,
} from "../../utils/constants.utility";
import { CustomError } from "../../utils/customError.utility";

class AuthService {
  async register(data) {
    if (data?.password !== data?.confirmPassword) {
      throw new CustomError(MESSAGES.PASSWORD_NOT_SAME, 400);
    }

    const existingUser = await User.findOne({
      $or: [{ email: data.email }, { username: data.username }],
    });
    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new CustomError(MESSAGES.EMAIL_ALREADY_REGISTERED, 409);
      }
      if (existingUser.username === data.username) {
        const username_sugessions = await generateUniqueUsername(data.username);
        throw new CustomError(
          `${MESSAGES.USERNAME_ALREADY_REGISTERED} : ${username_sugessions}`,
          409
        );
      }
    }
    console.log("data.password", data.password);

    const hashedPassword = await bcrypt.hash(data.password, 10);
    data.password = hashedPassword;
    const newUser = await User.create(data);

    const token = generateToken({
      id: newUser._id,
      role: newUser.role,
      tokenVersion: newUser.tokenVersion,
    });
    return { user: newUser, token };
  }
  async googleLogin(data) {
    const { email, name, googleId } = data;
    let user = await User.findOne({ email });
    if (!user) {
      const username = await generateUniqueUsername(name);
      // Generate a random password for Google OAuth users
      const randomPassword = await bcrypt.hash(googleId + Date.now(), 10);
      user = await User.create({
        email,
        firstName: name,
        username,
        googleId,
        password: randomPassword,
      });
    }

    const token = generateToken({
      id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    return { user, token };
  }
  async login({ email, password }) {
    let user: any = await User.findOne({
      email: email,
    }).select("+password");
    if (!user) throw new CustomError(MESSAGES.EMAIL_NOT_FOUND, 404);
    const ok = await bcrypt.compare(password, user.password);
    console.log("ok", ok, user?.email, email, password);

    if (!ok) throw new CustomError(MESSAGES.INVALID_CREDENTIALS, 401);

    // Check if user account is banned or suspended
    if (user.accountStatus === "BANNED") {
      // Check if temporary ban has expired
      if (user?.bannedUntil && new Date() > user?.bannedUntil) {
        user.accountStatus = "ACTIVE";
        user.bannedUntil = undefined;
        await user.save();
      } else {
        const message = user?.bannedUntil
          ? `Your account is banned until ${user?.bannedUntil.toISOString()}. Please contact support for more information.`
          : "Your account has been permanently banned. Please contact support for more information.";
        throw new CustomError(message, 403);
      }
    }

    if (user.accountStatus === "SUSPENDED") {
      throw new CustomError(
        "Your account has been suspended. Please contact support for more information.",
        403
      );
    }

    if (user.tokenVersion !== 0) {
      user.tokenVersion = 0;
      await user.save();
    }
    const token = generateToken({
      id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    return { user, token };
  }
  async updateProfile(id, body) {
    return User.findByIdAndUpdate(id, body, { new: true });
  }
  async logout(id) {
    return User.findByIdAndUpdate(id, { tokenVersion: 1 }, { new: true });
  }
}
export default new AuthService();
