/**
 * Round Rules Generator
 *
 * Generates predefined rules for each round of the game.
 * Rules determine Win/Loss/No-Change outcomes and amounts.
 */

export interface RoundRule {
  roundNumber: number;
  type: "WIN" | "LOSS" | "NO_CHANGE";
  amount: number;
  description: string;
}

/**
 * Generate round rules for a game
 *
 * Distribution strategy:
 * - 40% WIN rounds (positive scores)
 * - 35% LOSS rounds (negative scores)
 * - 25% NO_CHANGE rounds (no score impact)
 *
 * Amount strategy:
 * - Small amounts (5-10): 50%
 * - Medium amounts (15-25): 30%
 * - Large amounts (30-50): 20%
 *
 * @param gameLength Total number of rounds (26 or 52)
 * @param baseBetAmount Base bet amount for the room (default: 25)
 * @returns Array of round rules
 */
export function generateRoundRules(
  gameLength: number,
  baseBetAmount: number = 25
): RoundRule[] {
  const rules: RoundRule[] = [];

  // Calculate distribution
  const winRounds = Math.floor(gameLength * 0.4); // 40%
  const lossRounds = Math.floor(gameLength * 0.35); // 35%
  const noChangeRounds = gameLength - winRounds - lossRounds; // ~25%

  // Create rule pool
  const ruleTypes: Array<"WIN" | "LOSS" | "NO_CHANGE"> = [
    ...Array(winRounds).fill("WIN"),
    ...Array(lossRounds).fill("LOSS"),
    ...Array(noChangeRounds).fill("NO_CHANGE"),
  ];

  // Shuffle rule types for randomness
  shuffleArray(ruleTypes);

  // Generate rules for each round
  for (let i = 0; i < gameLength; i++) {
    const type = ruleTypes[i];
    let amount = 0;

    if (type !== "NO_CHANGE") {
      // Generate amount based on distribution
      const rand = Math.random();
      if (rand < 0.5) {
        // 50% - Small amounts (5-10)
        amount = Math.floor(Math.random() * 6 + 5);
      } else if (rand < 0.8) {
        // 30% - Medium amounts (15-25)
        amount = Math.floor(Math.random() * 11 + 15);
      } else {
        // 20% - Large amounts (30-50)
        amount = Math.floor(Math.random() * 21 + 30);
      }
    }

    rules.push({
      roundNumber: i + 1,
      type,
      amount,
      description: generateDescription(type, amount),
    });
  }

  return rules;
}

/**
 * Generate alternative round rules with seeded randomness
 *
 * Uses a seed to generate deterministic rules for reproducibility.
 *
 * @param gameLength Total number of rounds
 * @param baseBetAmount Base bet amount
 * @param seed Random seed for deterministic generation
 * @returns Array of round rules
 */
export function generateSeededRoundRules(
  gameLength: number,
  baseBetAmount: number = 25,
  seed: string
): RoundRule[] {
  // Simple seeded random generator
  let seedValue = hashCode(seed);

  const seededRandom = (): number => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  };

  const rules: RoundRule[] = [];

  for (let i = 0; i < gameLength; i++) {
    const rand = seededRandom();
    let type: "WIN" | "LOSS" | "NO_CHANGE";
    let amount = 0;

    // Determine type based on seeded random
    if (rand < 0.4) {
      type = "WIN";
    } else if (rand < 0.75) {
      type = "LOSS";
    } else {
      type = "NO_CHANGE";
    }

    // Generate amount if not NO_CHANGE
    if (type !== "NO_CHANGE") {
      const amountRand = seededRandom();
      if (amountRand < 0.5) {
        amount = Math.floor(seededRandom() * 6 + 5); // 5-10
      } else if (amountRand < 0.8) {
        amount = Math.floor(seededRandom() * 11 + 15); // 15-25
      } else {
        amount = Math.floor(seededRandom() * 21 + 30); // 30-50
      }
    }

    rules.push({
      roundNumber: i + 1,
      type,
      amount,
      description: generateDescription(type, amount),
    });
  }

  return rules;
}

/**
 * Generate predefined balanced rules (for testing/demo)
 *
 * Creates a balanced set of rules with predictable patterns.
 *
 * @param gameLength Total number of rounds
 * @param baseBetAmount Base bet amount
 * @returns Array of round rules
 */
export function generateBalancedRules(
  gameLength: number,
  baseBetAmount: number = 25
): RoundRule[] {
  const rules: RoundRule[] = [];
  const pattern = ["WIN", "WIN", "LOSS", "WIN", "NO_CHANGE"];

  for (let i = 0; i < gameLength; i++) {
    const type = pattern[i % pattern.length] as "WIN" | "LOSS" | "NO_CHANGE";
    let amount = 0;

    if (type !== "NO_CHANGE") {
      // Cycle through amounts
      const amounts = [10, 15, 20, 25, 5];
      amount = amounts[i % amounts.length];
    }

    rules.push({
      roundNumber: i + 1,
      type,
      amount,
      description: generateDescription(type, amount),
    });
  }

  return rules;
}

/**
 * Generate description text for a rule
 */
function generateDescription(
  type: "WIN" | "LOSS" | "NO_CHANGE",
  amount: number
): string {
  switch (type) {
    case "WIN":
      return `Win $${amount}`;
    case "LOSS":
      return `Lose $${amount}`;
    case "NO_CHANGE":
      return "No change";
    default:
      return "Unknown";
  }
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Simple hash function for seed
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Validate round rules
 */
export function validateRoundRules(
  rules: RoundRule[],
  gameLength: number
): boolean {
  if (rules.length !== gameLength) {
    console.error(
      `Invalid rules length: expected ${gameLength}, got ${rules.length}`
    );
    return false;
  }

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (rule.roundNumber !== i + 1) {
      console.error(
        `Invalid round number at index ${i}: expected ${i + 1}, got ${
          rule.roundNumber
        }`
      );
      return false;
    }
    if (!["WIN", "LOSS", "NO_CHANGE"].includes(rule.type)) {
      console.error(
        `Invalid rule type at round ${rule.roundNumber}: ${rule.type}`
      );
      return false;
    }
    if (rule.type !== "NO_CHANGE" && rule.amount <= 0) {
      console.error(
        `Invalid amount at round ${rule.roundNumber}: ${rule.amount}`
      );
      return false;
    }
  }

  return true;
}

export default {
  generateRoundRules,
  generateSeededRoundRules,
  generateBalancedRules,
  validateRoundRules,
};
