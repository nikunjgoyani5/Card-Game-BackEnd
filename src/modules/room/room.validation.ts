import Joi from "joi";
import { DECKS, WALLET_TYPE } from "../../utils/constants.utility";

export const roomSchema = Joi.object({
  roomType: Joi.string()
    .valid("PUBLIC", "PRIVATE")
    .default("PUBLIC")
    .optional(),
  isPrivate: Joi.boolean().default(false).optional(), // Legacy field
  gameLength: Joi.number().valid(26, 52).default(52).required(),
  deck: Joi.number().valid(52, 39, 26).default(DECKS.FULL).optional(),
  maxPlayers: Joi.number().valid(2, 4, 13).default(4).required(),
  betMultiplier: Joi.number().min(1).integer().default(1).required(),
  baseBetAmount: Joi.number().min(25).default(25).optional(),
  scheduledStartTime: Joi.string().isoDate().optional(),

  // Legacy fields (kept for compatibility)
  stake: Joi.number().default(25).optional(),
  walletType: Joi.string()
    .valid(WALLET_TYPE.FREE_COIN, WALLET_TYPE.REAL_MONEY)
    .optional(),
  startDate: Joi.string().isoDate().optional(),
});

export const joinRoomSchema = Joi.object({
  joinMethod: Joi.string()
    .valid("MATCHMAKING", "ROOM_CODE", "INVITATION")
    .required(),
  roomCode: Joi.string().length(6).uppercase().when("joinMethod", {
    is: "ROOM_CODE",
    then: Joi.required(),
  }),
  invitationToken: Joi.string().when("joinMethod", {
    is: "INVITATION",
    then: Joi.required(),
  }),
  gameLength: Joi.number().valid(26, 52).when("joinMethod", {
    is: "MATCHMAKING",
    then: Joi.required(),
  }),
  betMultiplier: Joi.number().min(1).integer().when("joinMethod", {
    is: "MATCHMAKING",
    then: Joi.required(),
  }),
  maxPlayers: Joi.number().valid(2, 4, 13).when("joinMethod", {
    is: "MATCHMAKING",
    then: Joi.optional(),
  }),

  // Legacy fields
  code: Joi.string().optional(),
  roomId: Joi.string().optional(),
  seat: Joi.number().optional(),
  socketId: Joi.string().optional(),
});

export const scheduleRoomSchema = Joi.object({
  roomType: Joi.string()
    .valid("PUBLIC", "PRIVATE")
    .default("PRIVATE")
    .required(),
  gameLength: Joi.number().valid(26, 52).default(52).required(),
  maxPlayers: Joi.number().valid(2, 4, 13).default(4).required(),
  betMultiplier: Joi.number().min(1).integer().default(1).required(),
  baseBetAmount: Joi.number().min(25).default(25).optional(),
  scheduledStartTime: Joi.string().isoDate().required(),
  inviteFriends: Joi.array().items(Joi.string()).optional(),
});

export const roomPublicSchema = Joi.object({
  gameMode: Joi.string()
    .valid(WALLET_TYPE.FREE_COIN, WALLET_TYPE.REAL_MONEY)
    .optional(),
  gameLength: Joi.number().valid(26, 52).optional(),
  betMultiplier: Joi.number().min(1).integer().optional(),
  maxPlayers: Joi.number().valid(2, 4, 13).optional(),

  // Legacy fields
  stake: Joi.number().optional(),
  deck: Joi.number().valid(DECKS.FULL, DECKS.HALF, DECKS.QUARTER).optional(),
  walletType: Joi.string()
    .valid(WALLET_TYPE.FREE_COIN, WALLET_TYPE.REAL_MONEY)
    .optional(),
});

export const roomIdSchema = Joi.object({
  id: Joi.string().required(),
});
