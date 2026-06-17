import { asyncHandler } from "../../utils/asyncHandler.utility";
import WalletService from "./wallet.service";
import { stripe } from "../../utils/stripe.utility";
import Stripe from "stripe";
import { success } from "../../utils/apiResponse.utility";

// Get wallet balance
export const getWalletBalance = asyncHandler(async (req: any, res) => {
  const data = await WalletService.getBalance(req.user._id);
  return success(res, "Wallet balance retrieved successfully", data);
});

// Lock entry fee
export const lockEntryFee = asyncHandler(async (req: any, res) => {
  const { amount, gameMode, roomId } = req.body;
  const ipAddress = req.ip;
  const deviceId = req.headers["x-device-id"];

  const data = await WalletService.lockEntryFee(
    req.user._id,
    amount,
    gameMode,
    roomId,
    ipAddress,
    deviceId
  );
  return success(res, "Entry fee locked successfully", data);
});

// Unlock entry fee
export const unlockEntryFee = asyncHandler(async (req: any, res) => {
  const { amount, gameMode, roomId } = req.body;
  const ipAddress = req.ip;
  const deviceId = req.headers["x-device-id"];

  const data = await WalletService.unlockEntryFee(
    req.user._id,
    amount,
    gameMode,
    roomId,
    ipAddress,
    deviceId
  );
  return success(res, "Entry fee unlocked successfully", data);
});

// Buy coins
export const buyCoins = asyncHandler(async (req: any, res) => {
  const { packageId } = req.body;
  const ipAddress = req.ip;
  const deviceId = req.headers["x-device-id"];

  const data = await WalletService.buyCoins(
    req.user._id,
    packageId,
    ipAddress,
    deviceId
  );
  return success(res, "Coins purchased successfully", data);
});

// Grant ad reward
export const grantAdReward = asyncHandler(async (req: any, res) => {
  const { adId, adRevenue } = req.body;
  const ipAddress = req.ip;
  const deviceId = req.headers["x-device-id"];

  const data = await WalletService.grantAdReward(
    req.user._id,
    adId,
    adRevenue,
    ipAddress,
    deviceId
  );
  return success(res, "Ad reward granted successfully", data);
});

// Legacy: Add money
export const addMoney = asyncHandler(async (req: any, res) => {
  const { amount, walletType } = req.body;
  const data = await WalletService.deposit(req.user._id, amount, walletType);
  return success(res, "Deposit started", data);
});

// Legacy: Withdraw money
export const withdrawMoney = asyncHandler(async (req: any, res) => {
  const { amount, walletType, bankAccountId } = req.body;
  const data = await WalletService.withdraw(
    req.user._id,
    amount,
    walletType,
    bankAccountId
  );
  return success(res, "Withdraw success", data);
});

// Stripe Webhook Handler
export const stripeWebhook = async (req: any, res: any) => {
  let event: Stripe.Event;

  try {
    const sig = req.headers["stripe-signature"]!;
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    await WalletService.confirmDeposit(event);
  }

  res.json({ received: true });
};
