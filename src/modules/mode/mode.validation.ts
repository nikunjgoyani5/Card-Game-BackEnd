import Joi from "joi";
import { WALLET_TYPE } from "../../utils/constants.utility";

export const selectModeValidation = Joi.object({
  mode: Joi.string()
    .valid(WALLET_TYPE.FREE_COIN, WALLET_TYPE.REAL_MONEY)
    .required()
    .messages({
      "any.only": "Invalid mode. Allowed: FREE_COIN, REAL_MONEY",
      "any.required": "Mode is required",
    }),
});
