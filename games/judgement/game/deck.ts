import { type Card, type Rank, SUITS, type Suit } from "@/lib/cards/cards";

/** Trump goes round in this order, starting with Spades in round 1. */
const TRUMP_ORDER: readonly Suit[] = ["S", "H", "C", "D"];

export const trumpFor = (round: number): Suit => TRUMP_ORDER[(round - 1) % TRUMP_ORDER.length];

/** The full 52-card deck. Ace is stored as rank 14. */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) deck.push({ suit, rank: rank as Rank });
  }
  return deck;
}

/** Cards each player gets in the first round: as many as the whole deck deals out evenly. */
export const openingHandSize = (players: number) => Math.floor(buildDeck().length / players);

/**
 * Cards each player is dealt in a round. The first round deals X, then X-1, X-2 down to 1, then 2, 3 back up
 * to X, and the cycle repeats.
 */
export function handSizeFor(round: number, players: number): number {
  const top = openingHandSize(players);
  const period = 2 * (top - 1);
  const t = (round - 1) % period;
  return t < top ? top - t : t - top + 2;
}
