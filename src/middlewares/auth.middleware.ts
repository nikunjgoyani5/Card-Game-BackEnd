import { verifyToken } from "../utils/jwt.utility";
import User from "../models/User.model";

export const authMiddleware = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth)
      return res.status(401).json({ status: false, message: "No token" });
    const token = auth.split(" ")[1];
    const decoded: any = verifyToken(token);
    console.log(decoded);

    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(401).json({ status: false, message: "Invalid token" });

    if (!user || user?.tokenVersion !== decoded?.tokenVersion)
      return res.status(401).json({ status: false, message: "Invalid token" });

    // Check if user account is banned or suspended
    if (user.accountStatus === "BANNED") {
      // Check if temporary ban has expired
      if (user.bannedUntil && new Date() > user.bannedUntil) {
        user.accountStatus = "ACTIVE";
        user.bannedUntil = undefined;
        await user.save();
      } else {
        return res.status(403).json({
          status: false,
          message: user.bannedUntil
            ? `Your account is banned until ${user.bannedUntil.toISOString()}. Please contact support for more information.`
            : "Your account has been permanently banned. Please contact support for more information.",
          code: "ACCOUNT_BANNED",
          bannedUntil: user.bannedUntil || null,
        });
      }
    }

    if (user.accountStatus === "SUSPENDED") {
      return res.status(403).json({
        status: false,
        message:
          "Your account has been suspended. Please contact support for more information.",
        code: "ACCOUNT_SUSPENDED",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
