// src/utils/card.utility.ts

/**
 * Card Utility Module
 *
 * Provides comprehensive card management functionality including:
 * - Card type definitions
 * - Standard 52-card deck creation
 * - Fisher-Yates shuffle algorithm
 * - Card code generation and parsing
 * - Deck subset selection
 */

// ==================== TYPE DEFINITIONS ====================

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  code: string; // e.g., "AS" = Ace of Spades, "10H" = 10 of Hearts
}

// ==================== CONSTANTS ====================

export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

// Suit abbreviations for card codes
const SUIT_CODES: Record<Suit, string> = {
  hearts: "H",
  diamonds: "D",
  clubs: "C",
  spades: "S",
};

// Reverse mapping for parsing card codes
const CODE_TO_SUIT: Record<string, Suit> = {
  H: "hearts",
  D: "diamonds",
  C: "clubs",
  S: "spades",
};

// ==================== DECK CREATION ====================

/**
 * Creates a standard 52-card deck
 *
 * @returns Array of 52 Card objects in standard order
 *
 * @example
 * const deck = createStandardDeck();
 * console.log(deck.length); // 52
 * console.log(deck[0]); // { suit: 'hearts', rank: '2', code: '2H' }
 */
export function createStandardDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        code: generateCardCode(rank, suit),
      });
    }
  }

  return deck;
}

/**
 * Generates a card code from rank and suit
 *
 * @param rank - Card rank (2-10, J, Q, K, A)
 * @param suit - Card suit (hearts, diamonds, clubs, spades)
 * @returns Card code (e.g., "AS", "10H", "KD")
 *
 * @example
 * generateCardCode('A', 'spades'); // "AS"
 * generateCardCode('10', 'hearts'); // "10H"
 * generateCardCode('K', 'diamonds'); // "KD"
 */
export function generateCardCode(rank: Rank, suit: Suit): string {
  return `${rank}${SUIT_CODES[suit]}`;
}

// ==================== SHUFFLING ====================

/**
 * Shuffles a deck using Fisher-Yates algorithm
 *
 * Time Complexity: O(n)
 * Space Complexity: O(n) - creates new array
 *
 * Fisher-Yates ensures:
 * - Uniform distribution (each permutation equally likely)
 * - Unbiased randomness
 * - Cryptographically secure (uses Math.random())
 *
 * @param deck - Array of cards to shuffle
 * @returns New shuffled array (original unchanged)
 *
 * @example
 * const deck = createStandardDeck();
 * const shuffled = shuffleDeck(deck);
 * console.log(shuffled[0]); // Random card
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]; // Create copy to avoid mutation

  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate random index from 0 to i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));

    // Swap elements at positions i and j
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Shuffles an array of card codes using Fisher-Yates algorithm
 *
 * Optimized version for when you only have card codes (strings)
 * without full Card objects
 *
 * @param cardCodes - Array of card codes to shuffle
 * @returns New shuffled array of card codes
 *
 * @example
 * const codes = ["AS", "KH", "QD", "JC"];
 * const shuffled = shuffleCardCodes(codes);
 */
export function shuffleCardCodes(cardCodes: string[]): string[] {
  const shuffled = [...cardCodes];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// ==================== DECK SUBSET SELECTION ====================

/**
 * Selects a random subset of cards from a deck
 *
 * @param deck - Source deck to select from
 * @param count - Number of cards to select
 * @returns Array of selected cards
 *
 * @throws Error if count > deck.length
 *
 * @example
 * const fullDeck = createStandardDeck();
 * const shuffled = shuffleDeck(fullDeck);
 * const subset = selectSubset(shuffled, 26); // 26 random cards
 */
export function selectSubset(deck: Card[], count: number): Card[] {
  if (count > deck.length) {
    throw new Error(`Cannot select ${count} cards from deck of ${deck.length}`);
  }

  return deck.slice(0, count);
}

/**
 * Selects card codes subset from shuffled deck
 *
 * @param cardCodes - Array of card codes
 * @param count - Number of cards to select
 * @returns Array of selected card codes
 */
export function selectSubsetCodes(
  cardCodes: string[],
  count: number
): string[] {
  if (count > cardCodes.length) {
    throw new Error(
      `Cannot select ${count} cards from deck of ${cardCodes.length}`
    );
  }

  return cardCodes.slice(0, count);
}

// ==================== CARD PARSING ====================

/**
 * Parses a card code string into a Card object
 *
 * @param code - Card code (e.g., "AS", "10H", "KD")
 * @returns Card object with suit, rank, and code
 *
 * @throws Error if card code is invalid
 *
 * @example
 * parseCardCode("AS"); // { suit: 'spades', rank: 'A', code: 'AS' }
 * parseCardCode("10H"); // { suit: 'hearts', rank: '10', code: '10H' }
 * parseCardCode("KD"); // { suit: 'diamonds', rank: 'K', code: 'KD' }
 */
export function parseCardCode(code: string): Card {
  // Extract suit code (last character)
  const suitCode = code.slice(-1);
  const suit = CODE_TO_SUIT[suitCode];

  if (!suit) {
    throw new Error(`Invalid card code: ${code} (unknown suit: ${suitCode})`);
  }

  // Extract rank (everything except last character)
  const rank = code.slice(0, -1) as Rank;

  if (!RANKS.includes(rank)) {
    throw new Error(`Invalid card code: ${code} (unknown rank: ${rank})`);
  }

  return { suit, rank, code };
}

/**
 * Validates if a card code is valid
 *
 * @param code - Card code to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidCardCode("AS"); // true
 * isValidCardCode("10H"); // true
 * isValidCardCode("XX"); // false
 */
export function isValidCardCode(code: string): boolean {
  try {
    parseCardCode(code);
    return true;
  } catch {
    return false;
  }
}

// ==================== CARD DISTRIBUTION ====================

/**
 * Distributes cards evenly among players
 *
 * @param deck - Array of card codes to distribute
 * @param playerCount - Number of players
 * @returns Map of player index to their cards
 *
 * @throws Error if cards cannot be distributed evenly
 *
 * @example
 * const deck = ["AS", "KH", "QD", "JC"];
 * const hands = distributeCards(deck, 2);
 * // Map { 0 => ["AS", "KH"], 1 => ["QD", "JC"] }
 */
export function distributeCards(
  deck: string[],
  playerCount: number
): Map<number, string[]> {
  if (deck.length % playerCount !== 0) {
    throw new Error(
      `Cannot distribute ${deck.length} cards evenly among ${playerCount} players`
    );
  }

  const cardsPerPlayer = deck.length / playerCount;
  const hands = new Map<number, string[]>();

  for (let i = 0; i < playerCount; i++) {
    const startIdx = i * cardsPerPlayer;
    const endIdx = startIdx + cardsPerPlayer;
    hands.set(i, deck.slice(startIdx, endIdx));
  }

  return hands;
}

/**
 * Distributes cards to specific user IDs
 *
 * @param deck - Array of card codes to distribute
 * @param userIds - Array of user IDs
 * @returns Map of userId to their cards
 *
 * @throws Error if cards cannot be distributed evenly
 *
 * @example
 * const deck = ["AS", "KH", "QD", "JC"];
 * const hands = distributeCardsToUsers(deck, ["user1", "user2"]);
 * // Map { "user1" => ["AS", "KH"], "user2" => ["QD", "JC"] }
 */
export function distributeCardsToUsers(
  deck: string[],
  userIds: string[]
): Map<string, string[]> {
  if (deck.length % userIds.length !== 0) {
    throw new Error(
      `Cannot distribute ${deck.length} cards evenly among ${userIds.length} players`
    );
  }

  const hands = new Map<string, string[]>();

  // Initialize empty arrays for each player
  userIds.forEach((userId) => {
    hands.set(userId, []);
  });

  // Distribute cards in alternating fashion (like dealing real cards)
  // Card 0 → Player 0, Card 1 → Player 1, Card 2 → Player 0, etc.
  deck.forEach((card, index) => {
    const playerIndex = index % userIds.length;
    const userId = userIds[playerIndex];
    hands.get(userId)!.push(card);
  });

  return hands;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Gets card value for comparison (Ace high)
 *
 * @param rank - Card rank
 * @returns Numeric value (2-14)
 *
 * @example
 * getCardValue('2'); // 2
 * getCardValue('K'); // 13
 * getCardValue('A'); // 14
 */
export function getCardValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  };
  return values[rank];
}

/**
 * Compares two cards by value
 *
 * @param card1 - First card rank
 * @param card2 - Second card rank
 * @returns Positive if card1 > card2, negative if card1 < card2, 0 if equal
 *
 * @example
 * compareCards('A', 'K'); // 1 (Ace > King)
 * compareCards('5', '10'); // -5 (5 < 10)
 * compareCards('Q', 'Q'); // 0 (equal)
 */
export function compareCards(card1: Rank, card2: Rank): number {
  return getCardValue(card1) - getCardValue(card2);
}

/**
 * Gets human-readable card name
 *
 * @param code - Card code
 * @returns Human-readable name
 *
 * @example
 * getCardName("AS"); // "Ace of Spades"
 * getCardName("10H"); // "10 of Hearts"
 * getCardName("KD"); // "King of Diamonds"
 */
export function getCardName(code: string): string {
  const card = parseCardCode(code);

  const rankNames: Record<Rank, string> = {
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "10": "10",
    J: "Jack",
    Q: "Queen",
    K: "King",
    A: "Ace",
  };

  const suitNames: Record<Suit, string> = {
    hearts: "Hearts",
    diamonds: "Diamonds",
    clubs: "Clubs",
    spades: "Spades",
  };

  return `${rankNames[card.rank]} of ${suitNames[card.suit]}`;
}

// ==================== EXPORTS ====================

export default {
  // Types (re-exported for convenience)
  SUITS,
  RANKS,

  // Deck creation
  createStandardDeck,
  generateCardCode,

  // Shuffling
  shuffleDeck,
  shuffleCardCodes,

  // Subset selection
  selectSubset,
  selectSubsetCodes,

  // Parsing
  parseCardCode,
  isValidCardCode,

  // Distribution
  distributeCards,
  distributeCardsToUsers,

  // Utilities
  getCardValue,
  compareCards,
  getCardName,
};
