import { Router } from "express";
import * as Auth from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  googleLoginSchema,
} from "./auth.validation";
const router = Router();

router.post("/register", validate(registerSchema), Auth.register);

router.post("/login", validate(loginSchema), Auth.login);

router.post("/google", validate(googleLoginSchema), Auth.googleLogin);

router.get("/profile", authMiddleware, Auth.getProfile);

router.put(
  "/profile",
  authMiddleware,
  validate(profileUpdateSchema),
  Auth.updateProfile
);

router.post("/logout", authMiddleware, Auth.logout);

export default router;
