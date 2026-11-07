import { type Card, isCard } from "@/lib/cards/cards";
import type { CommonAction } from "@/lib/net/wire";

/** What a player asks the host to do. The host decides whether it is allowed. */
export type GameAction =
  | { type: "team"; seat: number; team: 0 | 1 }
  | { type: "begin" }
  | { type: "play"; card: Card }
  | { type: "ready" }
  | { type: "end" };

export type Action = GameAction | CommonAction;

const isSeat = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 6;

export function parseGameAction(a: Record<string, unknown>): GameAction | null {
  switch (a.type) {
    case "ready":
      return { type: "ready" };
    case "end":
      return { type: "end" };
    case "begin":
      return { type: "begin" };
    case "team":
      return isSeat(a.seat) && (a.team === 0 || a.team === 1) ? { type: "team", seat: a.seat, team: a.team } : null;
    case "play":
      return isCard(a.card) ? { type: "play", card: { suit: a.card.suit, rank: a.card.rank } } : null;
    default:
      return null;
  }
}
