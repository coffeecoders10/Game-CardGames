import type { Card, Suit } from "@/lib/cards/cards";
import type { TableViewOf } from "@/lib/net/view";
import type { Game, RoundRecord, StartPlan, Step, TrickPlay } from "./engine";

/**
 * What one player is allowed to see. The host builds one per seat and sends it encrypted to that
 * seat only: other hands never leave the host. Teams, tricks, captured 10s and coats are public.
 * The next round's opener is decided by the host and only ever shown, never computed here.
 */
export interface GameView {
  players: number;
  step: Step;
  teams: [number[], number[]];
  order: number[];
  round: number;
  handSize: number;
  trump: Suit | null;
  trumpBy: number | null;
  starter: number;
  turn: number;
  trick: TrickPlay[];
  trickWinner: number | null;
  lastWinner: number | null;
  tricksPlayed: number;
  tens: [Card[], Card[]];
  handsWon: [number, number];
  /** Coats each team holds, never both above zero. */
  coats: [number, number];
  next: StartPlan | null;
  handCounts: number[];
  hand: Card[];
  history: RoundRecord[];
  ready: boolean[];
}

export type TableView = TableViewOf<GameView>;

export function gameViewFor(g: Game, seat: number): GameView {
  return {
    players: g.players,
    step: g.step,
    teams: g.teams,
    order: g.order,
    round: g.round,
    handSize: g.handSize,
    trump: g.trump,
    trumpBy: g.trumpBy,
    starter: g.starter,
    turn: g.turn,
    trick: g.trick,
    trickWinner: g.trickWinner,
    lastWinner: g.lastWinner,
    tricksPlayed: g.tricksPlayed,
    tens: g.tens,
    handsWon: g.handsWon,
    coats: [Math.max(g.coat, 0), Math.max(-g.coat, 0)],
    next: g.next,
    handCounts: g.hands.map((h) => h.length),
    hand: g.hands[seat],
    history: g.history,
    ready: g.ready,
  };
}
