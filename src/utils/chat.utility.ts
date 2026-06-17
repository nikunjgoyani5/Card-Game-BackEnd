// Predefined quick messages for lobby chat
export const QUICK_MESSAGES: Record<string, string> = {
  QM_001: "Good luck everyone!",
  QM_002: "Let's play!",
  QM_003: "Nice game!",
  QM_004: "Well played!",
  QM_005: "Thanks!",
  QM_006: "Sorry!",
  QM_007: "Rematch?",
  QM_008: "BRB",
  QM_009: "GG!",
  QM_010: "Welcome!",
};

// Error codes for chat system
export const CHAT_ERROR_CODES = {
  CHAT_001: "Cannot send chat in this room",
  CHAT_002: "You are muted",
  CHAT_003: "Too many messages. Slow down.",
  CHAT_004: "Message too long",
  CHAT_005: "Invalid quick message ID",
  CHAT_006: "Room not found",
  CHAT_007: "Game already started",
};

// Rate limiting configuration
export const CHAT_RATE_LIMIT = {
  MAX_MESSAGES_PER_MINUTE: 10,
  WINDOW_SECONDS: 60,
};

// Chat configuration
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 500,
  MAX_HISTORY_MESSAGES: 50,
  MESSAGE_TTL_DAYS: 7,
};
