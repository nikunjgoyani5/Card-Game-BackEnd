import Joi from "joi";
import { WALLET_TYPE } from "../../utils/constants.utility";

export const lockEntryFeeValidation = Joi.object({
  amount: Joi.number().positive().required(),
  gameMode: Joi.string()
    .valid(WALLET_TYPE.FREE_COIN, WALLET_TYPE.REAL_MONEY)
    .required(),
  roomId: Joi.string().required(),
});

export const unlockEntryFeeValidation = Joi.object({
  amount: Joi.number().positive().required(),
  gameMode: Joi.string()
    .valid(WALLET_TYPE.FREE_COIN, WALLET_TYPE.REAL_MONEY)
    .required(),
  roomId: Joi.string().required(),
});

export const buyCoinsValidation = Joi.object({
  packageId: Joi.string()
    .valid("COIN_PKG_1", "COIN_PKG_5", "COIN_PKG_10", "COIN_PKG_20")
    .required(),
});

export const adRewardValidation = Joi.object({
  adId: Joi.string().required(),
  adRevenue: Joi.number().positive().required(),
});

export const depositValidation = Joi.object({
  amount: Joi.number().positive().required(),
  walletType: Joi.string()
    .valid(WALLET_TYPE.FREE_COIN, WALLET_TYPE.REAL_MONEY)
    .default(WALLET_TYPE.FREE_COIN)
    .required(),
});

export const withdrawValidation = Joi.object({
  amount: Joi.number().positive().required(),
  walletType: Joi.string()
    .valid(WALLET_TYPE.FREE_COIN, WALLET_TYPE.REAL_MONEY)
    .default(WALLET_TYPE.FREE_COIN)
    .required(),
  bankAccountId: Joi.string().required(), // your saved stripe bank account
});
