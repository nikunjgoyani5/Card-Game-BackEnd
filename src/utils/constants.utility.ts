// USER TYPES
export enum USER_TYPE {
  USER = "user",
  ADMIN = "admin",
}
export type UserType = `${USER_TYPE}`;

// AUTHENTICATION ERROR CODES
export enum AUTH_ERROR {
  UNAUTHORIZED = "AUTH_001", // Invalid or expired token
}

// WALLET TYPES
export enum WALLET_TYPE {
  FREE_COIN = "FREE_COIN",
  REAL_MONEY = "REAL_MONEY",
}
export type WalletType = `${WALLET_TYPE}`;

// TRANSACTION CONSTANTS
export enum TRANSACTION_STATUS {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}
export type TransactionStatus = `${TRANSACTION_STATUS}`;

export enum TRANSACTION_TYPE {
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  ENTRY_FEE_LOCK = "ENTRY_FEE_LOCK",
  ENTRY_FEE_UNLOCK = "ENTRY_FEE_UNLOCK",
  ENTRY_FEE_REFUND = "ENTRY_FEE_REFUND",
  GAME_WIN = "GAME_WIN",
  GAME_LOSS = "GAME_LOSS",
  PLATFORM_FEE = "PLATFORM_FEE",
  COIN_PURCHASE = "COIN_PURCHASE",
  AD_REWARD = "AD_REWARD",
  FLIP_REQUEST_BID = "FLIP_REQUEST_BID",
  FLIP_REQUEST_REFUND = "FLIP_REQUEST_REFUND",
  FLIP_REQUEST_PLATFORM_FEE = "FLIP_REQUEST_PLATFORM_FEE",
  REFUNDED = "REFUNDED",
}
export type TransactionType = `${TRANSACTION_TYPE}`;

// COIN PACKAGES
export const COIN_PACKAGES = {
  COIN_PKG_1: { cost: 1, coins: 200 },
  COIN_PKG_5: { cost: 5, coins: 1000 },
  COIN_PKG_10: { cost: 10, coins: 2500 },
  COIN_PKG_20: { cost: 20, coins: 5500 },
};

// WALLET ERROR CODES
export enum WALLET_ERROR {
  INSUFFICIENT_BALANCE = "WALLET_001",
  INSUFFICIENT_LOCKED = "WALLET_002",
  INVALID_PACKAGE = "WALLET_003",
  DAILY_AD_LIMIT = "WALLET_004",
  INVALID_AD = "WALLET_005",
  INVALID_AMOUNT = "WALLET_006",
  NEGATIVE_BALANCE = "WALLET_007",
}

// AD LIMITS
export const DAILY_AD_LIMIT = 10;

// MODE ERROR CODES
export enum MODE_ERROR {
  INVALID_MODE = "MODE_001",
  CANNOT_CHANGE_IN_GAME = "MODE_002",
  NO_MODE_SELECTED = "MODE_003",
}

// ROOM CONSTANTS
export enum ROOM_TYPE {
  PRIVATE = "PRIVATE",
  PUBLIC = "PUBLIC",
}
export type RoomType = `${ROOM_TYPE}`;

export enum ROOM_STATUS {
  WAITING = "WAITING", // Waiting for players
  IN_PROGRESS = "IN_PROGRESS", // Game active
  ENDED = "ENDED", // Game complete
  CANCELLED = "CANCELLED",
}
export type RoomStatus = `${ROOM_STATUS}`;

// ROOM ERROR CODES
export enum ROOM_ERROR {
  INVALID_GAME_LENGTH = "ROOM_001",
  INVALID_MAX_PLAYERS = "ROOM_002",
  ALREADY_IN_GAME = "ROOM_003",
  NO_MATCHING_ROOMS = "ROOM_004",
  ROOM_NOT_FOUND = "ROOM_005",
  ROOM_FULL = "ROOM_006",
  MODE_MISMATCH = "ROOM_007",
  ALREADY_STARTED = "ROOM_008",
  INVALID_ROOM_CODE = "ROOM_009",
  SCHEDULING_CONFLICT = "ROOM_010",
  MATCHMAKING_TIMEOUT = "ROOM_011",
  TOO_MANY_ATTEMPTS = "ROOM_012",
  NOT_ENOUGH_PLAYERS = "ROOM_013",
}

// GAME ERROR CODES
export enum GAME_ERROR {
  CARD_DISTRIBUTION = "GAME_001",
  SHUFFLE_ERROR = "GAME_002",
  ALL_FLIPS_COMPLETED = "GAME_003", // All flips have been completed
  NOT_YOUR_TURN = "GAME_004", // It's not your turn to flip
  FLIP_IN_PROGRESS = "GAME_005", // Flip already in progress, please wait
  INVALID_ROOM_STATE = "GAME_006", // Room is not in active game state
  GAME_NOT_COMPLETE = "GAME_007", // Cannot settle - game not complete
  ALREADY_SETTLED = "GAME_008", // Game already settled
  SETTLEMENT_ERROR = "GAME_009", // Error calculating final scores
  CANNOT_RECONNECT = "GAME_010", // Cannot reconnect - you've been replaced by a bot
  INVALID_RECONNECTION = "GAME_011", // Invalid reconnection attempt
  BOT_OPERATION_FAILED = "GAME_012", // Error initializing bot player
  CARD_NOT_FOUND = "GAME_013", // Critical error - revealed card not found in any player hand (data corruption)
  NOT_ROOM_HOST = "GAME_014", // Only room host can manually start the game
  INVALID_GAME_STATE = "GAME_015", // Invalid game state
}

// FLIP REQUEST ERROR CODES
export enum FLIP_ERROR {
  BID_TOO_LOW = "FLIP_001", // Bid amount below minimum. Minimum: $X
  BID_NOT_HIGHER = "FLIP_002", // Bid must be higher than current request: $X
  NOT_IN_GAME = "FLIP_003", // You are not in this game
  REQUESTS_DISABLED = "FLIP_004", // Flip requests disabled for this round
}

// RATE LIMITING ERROR CODES
export enum RATE_ERROR {
  TOO_MANY_REQUESTS = "RATE_001", // Too many requests. Please slow down.
}

// FRIEND ERROR CODES
export enum FRIEND_ERROR {
  ALREADY_FRIENDS = 409, // Already friends with this user (Conflict)
  PENDING_REQUEST = 409, // Friend request already pending (Conflict)
  CANNOT_SEND_REQUEST = 403, // Cannot send friend request to this user (Forbidden)
  DAILY_LIMIT_REACHED = 429, // Daily friend request limit reached (Too Many Requests)
  FRIEND_LIMIT_REACHED = 400, // Friend limit reached (Bad Request)
  USER_NOT_FOUND = 404, // User not found (Not Found)
  REQUEST_NOT_FOUND = 404, // Friend request not found (Not Found)
}

// FRIEND CONSTANTS
export const MAX_FRIENDS = 500;
export const DAILY_FRIEND_REQUEST_LIMIT = 20;
export const FRIEND_SEARCH_LIMIT = 20;

// PAYMENT ERROR CODES
export enum PAYMENT_ERROR {
  AMOUNT_TOO_LOW = 400, // Minimum deposit amount is $1 (Bad Request)
  AMOUNT_TOO_HIGH = 400, // Maximum deposit amount is $10,000 (Bad Request)
  INVALID_PAYMENT_METHOD = 400, // Invalid payment method (Bad Request)
  PAYMENT_FAILED = 402, // Payment processing failed (Payment Required)
  INVALID_WEBHOOK_SIGNATURE = 401, // Invalid webhook signature (Unauthorized)
  TRANSACTION_ALREADY_PROCESSED = 409, // Transaction already processed (Conflict)
  INVALID_TRANSACTION = 404, // Transaction not found or invalid (Not Found)
}

// PAYMENT CONSTANTS
export const MIN_DEPOSIT_AMOUNT = 1;
export const MAX_DEPOSIT_AMOUNT = 10000;
export const DEPOSIT_FEE_PERCENTAGE = 0.03; // 3%

export enum PAYMENT_METHOD {
  CREDIT_CARD = "CREDIT_CARD",
  PAYPAL = "PAYPAL",
  GOOGLE_PAY = "GOOGLE_PAY",
}
export type PaymentMethod = `${PAYMENT_METHOD}`;

export enum PAYMENT_STATUS {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED",
}
export type PaymentStatus = `${PAYMENT_STATUS}`;

// KYC ERROR CODES
export enum KYC_ERROR {
  VERIFICATION_REQUIRED = 403, // KYC verification required before withdrawal (Forbidden)
  VERIFICATION_EXPIRED = 410, // KYC verification expired. Please re-verify. (Gone)
  VERIFICATION_REJECTED = 403, // KYC verification rejected. Contact support. (Forbidden)
  INVALID_DOCUMENT = 400, // Invalid or missing document (Bad Request)
  ALREADY_VERIFIED = 409, // KYC already verified (Conflict)
  PENDING_VERIFICATION = 409, // KYC verification is pending (Conflict)
}

// KYC CONSTANTS
export const KYC_EXPIRY_YEARS = 2;

export enum KYC_STATUS {
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  IN_REVIEW = "IN_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}
export type KycStatus = `${KYC_STATUS}`;

export enum KYC_DOCUMENT_TYPE {
  ID = "ID",
  PROOF_OF_ADDRESS = "PROOF_OF_ADDRESS",
  SELFIE = "SELFIE",
}
export type KycDocumentType = `${KYC_DOCUMENT_TYPE}`;

// WITHDRAWAL ERROR CODES
export enum WITHDRAWAL_ERROR {
  MINIMUM_NOT_MET = 400, // Minimum withdrawal amount is $50 (Bad Request)
  INVALID_METHOD = 400, // Invalid withdrawal method (Bad Request)
  DAILY_LIMIT_REACHED = 429, // Daily withdrawal limit reached (Too Many Requests)
  PROCESSING_FAILED = 422, // Withdrawal processing failed (Unprocessable Entity)
  INVALID_DESTINATION = 400, // Invalid withdrawal destination (Bad Request)
}

// WITHDRAWAL CONSTANTS
export const MIN_WITHDRAWAL_AMOUNT = 50;
export const WITHDRAWAL_FEE = 2.0;
export const DAILY_WITHDRAWAL_LIMIT = 10000; // $10,000 per day

export enum WITHDRAWAL_METHOD {
  BANK_ACCOUNT = "BANK_ACCOUNT",
  PAYPAL = "PAYPAL",
  GOOGLE_WALLET = "GOOGLE_WALLET",
}
export type WithdrawalMethod = `${WITHDRAWAL_METHOD}`;

export enum WITHDRAWAL_STATUS {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED",
}
export type WithdrawalStatus = `${WITHDRAWAL_STATUS}`;

// SERVER ERROR CODES
export enum SERVER_ERROR {
  INTERNAL_ERROR = "SERVER_001", // Internal server error. Please try again.
}

// MATCHMAKING CONSTANTS
export const MATCHMAKING_TIMEOUT = 60; // seconds
export const MATCHMAKING_RATE_LIMIT = 5; // max attempts per minute

// GAME TABLE CONSTANTS
export enum DECKS {
  FULL = 52, // 52 cards
  HALF = 39, // 39 cards
  QUARTER = 26, // 26 cards
}
export type DeckType = `${DECKS}`;

// PLAYERS PER DECKS
export const PLAYERS_PER_DECKS = {
  [DECKS.FULL]: [2, 4, 13], // Full deck can be split among 2, 4, or 13 players
  [DECKS.HALF]: [13], // Half deck can be split among 3 or 13 players
  [DECKS.QUARTER]: [2, 13], // Quarter deck can be split among 2 or 13 players
};

// GAME SOCKET EVENTS
export enum SOCKET_EVENTS {
  CREATE_ROOM = "create_room",
  JOIN_ROOM = "join_room",
  LEAVE_ROOM = "leave_room",
  START_GAME = "start_game",
  PLAYER_JOINED = "player_joined",
  GAME_STARTED = "game_started",
  DEAL = "deal",
}
export type SocketEvent = `${SOCKET_EVENTS}`;

// GAME RULES
export enum GAME_RULES {
  RULE_1 = "same_suit_loose", // if got same card dealer & player, player loses, dealer gets bonus
  RULE_2 = "same_suit_bonus", // if got same card dealer & player, player gets bonus, dealer loses
  RULE_3 = "no_bonus", // no bonus for same card
}
export type GameRule = `${GAME_RULES}`;

// WIN/LOSE BONUS
export const WIN_BONUS = 10; // 10 bonus on win per round or lose
export const LOSE_BONUS = 10; // 10 bonus on lose per round

export const FREE_WALLET_TOPUP = 10000; // Free wallet top-up amount for new users
export const REAL_WALLET_TOPUP = 10000; // Free wallet top-up amount for new users

export const MESSAGES = {
  REGISTER_SUCCESS: "User registered successfully.",
  PASSWORD_NOT_SAME: "Confirm Password does not match.",
  LOGIN_SUCCESS: "Login successful.",
  LOGOUT_SUCCESS: "Logout successful.",
  PROFILE_UPDATE_SUCCESS: "Profile updated successfully.",
  PROFILE_GET_SUCCESS: "Profile retrieved successfully.",
  EMAIL_ALREADY_REGISTERED: "Email already registered",
  USERNAME_ALREADY_REGISTERED: "Username already taken username_sugessions",
  INVALID_CREDENTIALS: "Invalid credentials",
  EMAIL_NOT_FOUND: "Email not registered",
  BAD_REQUEST: "Bad request",
};

export const DEFAULT_TIMER_MS = 7000;
