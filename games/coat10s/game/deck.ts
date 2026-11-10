import { type Card, type Rank, SUITS } from "@/lib/cards/cards";

/**
 * The deck for a table: all 52 cards for four players; for six or eight the four 2s come out so the 48 left
 * deal out evenly (8 or 6 each).
 */
export function buildDeck(players: number): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = players >= 6 ? 3 : 2; rank <= 14; rank++) deck.push({ suit, rank: rank as Rank });
  }
  return deck;
}

/** Cards each player is dealt, which is also the number of hands in a round. */
export const handSizeFor = (players: number) => buildDeck(players).length / players;

export const isTen = (c: Card) => c.rank === 10;
