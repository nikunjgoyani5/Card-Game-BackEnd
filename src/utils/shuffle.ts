import crypto from "crypto";
import { DECKS } from "./constants.utility";

// build deck helper
export function buildDeck(deckType: DECKS = DECKS.FULL) {
  const suits: string[] = ["S", "H", "D", "C"];
  const ranks52: string[] = [
    "A",
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
  ];
  let cards = [];
  if (deckType === DECKS.FULL) {
    //@ts-ignore
    for (const s of suits) for (const r of ranks52) cards.push(r + s);
  } else if (deckType === DECKS.HALF) {
    cards = buildDeck(DECKS.FULL).slice(0, 26);
  } else if (deckType === DECKS.QUARTER) {
    cards = buildDeck(DECKS.FULL).slice(0, 13);
  }
  return cards;
}

// seeded shuffle using SHA256-based stream
export function seededShuffle(array, seed) {
  const a = array.slice();
  let h = Buffer.from(seed, "hex");
  function rnd() {
    h = crypto.createHash("sha256").update(h).digest();
    return h.readUInt32BE(0) / 0xffffffff;
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
