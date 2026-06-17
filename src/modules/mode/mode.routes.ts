import { Router } from "express";
import {
  selectMode,
  getCurrentMode,
  refreshModeSession,
} from "./mode.controller";
import { validate } from "../../middlewares/validation.middleware";
import { selectModeValidation } from "./mode.validation";

const router = Router();

router.post("/select", validate(selectModeValidation), selectMode);
router.get("/current", getCurrentMode);
router.post("/refresh", refreshModeSession);

export default router;
