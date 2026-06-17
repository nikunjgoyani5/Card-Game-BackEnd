import express from "express";
import {
  getWalletBalance,
  lockEntryFee,
  unlockEntryFee,
  buyCoins,
  grantAdReward,
  addMoney,
  withdrawMoney,
  stripeWebhook,
} from "./wallet.controller";

import {
  depositValidation,
  withdrawValidation,
  lockEntryFeeValidation,
  unlockEntryFeeValidation,
  buyCoinsValidation,
  adRewardValidation,
} from "./wallet.validation";
import { validate } from "../../middlewares/validation.middleware";

const router = express.Router();

// New wallet endpoints
router.get("/", getWalletBalance);
router.post("/lock-entry-fee", validate(lockEntryFeeValidation), lockEntryFee);
router.post(
  "/unlock-entry-fee",
  validate(unlockEntryFeeValidation),
  unlockEntryFee
);
router.post("/buy-coins", validate(buyCoinsValidation), buyCoins);
router.post("/ad-reward", validate(adRewardValidation), grantAdReward);

// Legacy endpoints
router.post("/deposit", validate(depositValidation), addMoney);
router.post("/withdraw", validate(withdrawValidation), withdrawMoney);

// Stripe Webhook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

export default router;
