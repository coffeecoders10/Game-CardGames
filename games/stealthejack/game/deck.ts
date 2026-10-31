import { type Card, type Rank, SUITS } from "@/lib/cards/cards";

/** The 52-card deck without the Jack of Diamonds: 51 cards, so one Jack is always left without a partner. */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      if (suit === "D" && rank === 11) continue;
      deck.push({ suit, rank: rank as Rank });
    }
  }
  return deck;
}
