import type { Card } from "@/lib/cards/cards";
import type { TableViewOf } from "@/lib/net/view";
import { type Game, type Move, type RoundSummary, type Slot, type Step, sourceOf } from "./engine";

/**
 * What one player is allowed to see. The host builds one per seat and sends it encrypted to that
 * seat only. Other hands are just counts, except that the player whose turn it is to pick also gets
 * the ids of the hand they pick from, in that hand's owner's order and without any card faces.
 */
export interface GameView {
  round: number;
  players: number;
  step: Step;
  turn: number;
  /** Whose hand the active player is picking from; null outside the pick step. */
  source: number | null;
  counts: number[];
  hand: Slot[];
  /** Slot ids of the source's hand, left to right as its owner sees them. Only for the active picker. */
  lineup: number[] | null;
  /** The slot in `hand` that was just taken, to highlight; null otherwise. */
  freshId: number | null;
  pile: Card[];
  lastMove: Move | null;
  losses: number[];
  summary: RoundSummary | null;
  ready: boolean[];
}

export type TableView = TableViewOf<GameView>;

export function gameViewFor(g: Game, seat: number): GameView {
  const picking = g.step === "pick";
  const source = picking ? sourceOf(g) : null;
  return {
    round: g.round,
    players: g.players,
    step: g.step,
    turn: g.turn,
    source,
    counts: g.hands.map((h) => h.length),
    hand: g.hands[seat],
    lineup: picking && source !== null && g.turn === seat ? g.hands[source].map((s) => s.id) : null,
    freshId: g.turn === seat ? g.freshId : null,
    pile: g.pile,
    lastMove: g.lastMove,
    losses: g.losses,
    summary: g.summary,
    ready: g.ready,
  };
}
