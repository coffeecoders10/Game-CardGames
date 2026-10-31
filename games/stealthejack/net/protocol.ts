import { type Card, isCard } from "@/lib/cards/cards";
import type { CommonAction } from "@/lib/net/wire";

/** What a player asks the host to do. The host decides whether it is allowed. */
export type GameAction =
  | { type: "pick"; id: number }
  | { type: "pair"; cards: [Card, Card] }
  | { type: "done" }
  | { type: "arrange"; order: number[] }
  | { type: "shuffle" }
  | { type: "ready" };

export type Action = GameAction | CommonAction;

const isId = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0;

export function parseGameAction(a: Record<string, unknown>): GameAction | null {
  switch (a.type) {
    case "done":
    case "shuffle":
    case "ready":
      return { type: a.type };
    case "pick":
      return isId(a.id) ? { type: "pick", id: a.id } : null;
    case "pair": {
      const cards = a.cards;
      if (Array.isArray(cards) && cards.length === 2 && isCard(cards[0]) && isCard(cards[1])) {
        return {
          type: "pair",
          cards: [
            { suit: cards[0].suit, rank: cards[0].rank },
            { suit: cards[1].suit, rank: cards[1].rank },
          ],
        };
      }
      return null;
    }
    case "arrange":
      return Array.isArray(a.order) && a.order.length <= 30 && a.order.every(isId)
        ? { type: "arrange", order: a.order as number[] }
        : null;
    default:
      return null;
  }
}
