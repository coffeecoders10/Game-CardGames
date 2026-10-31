import { type Card, type RandomInt, sameCard, shuffle } from "@/lib/cards/cards";
import { fail } from "@/lib/cards/rules";
import { buildDeck } from "./deck";

/**
 * Authoritative Steal the Jack rules. Everything here is pure: each action takes a Game and returns
 * a new Game, or throws a RuleError. Two to six seats play clockwise (seat order). Everyone first
 * discards pairs from their own hand, one player at a time. Then each turn the active player takes one
 * card, blind, from the next player who still holds cards, and may discard pairs again. Whoever is the
 * last to hold cards loses the round: normally that is whoever is stuck with the unmatched Jack.
 *
 * Every card in a hand sits in a `Slot` with a random id that means nothing outside this game. The
 * player picking from a hand only ever sees the ids, in the owner's order, and names one; the host
 * resolves it against the current hand. So rearranging and picking at the same moment can never hand
 * over a different card than the one that was named, and the ids give nothing away.
 */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/** discard: opening pairs, one seat at a time. pick/pair: the main loop. summary: the round is over. */
export type Step = "discard" | "pick" | "pair" | "summary";

export interface Slot {
  id: number;
  card: Card;
}

export type Move =
  | { id: number; kind: "pick"; seat: number; from: number }
  | { id: number; kind: "pair"; seat: number; cards: [Card, Card] };

export interface RoundSummary {
  loser: number;
  /** What the loser was still holding: public once the round is over. */
  hand: Card[];
}

export interface Game {
  round: number;
  players: number;
  /** Each hand in its owner's left-to-right order. */
  hands: Slot[][];
  /** Discarded cards, two at a time, oldest first. */
  pile: Card[];
  /** Seat that opens the discard phase and the first pick. Moves along each round. */
  first: number;
  turn: number;
  step: Step;
  lastMove: Move | null;
  moves: number;
  /** The slot the active player just took, so their view can highlight it. */
  freshId: number | null;
  /** Rounds lost per seat. The only score. */
  losses: number[];
  summary: RoundSummary | null;
  ready: boolean[];
}

const isHolder = (g: Pick<Game, "hands">, seat: number) => g.hands[seat].length > 0;

/** The next seat after `from` (clockwise) that still holds cards, or null when nobody does. */
function holderAfter(hands: readonly Slot[][], from: number): number | null {
  for (let k = 1; k <= hands.length; k++) {
    const seat = (from + k) % hands.length;
    if (hands[seat].length > 0) return seat;
  }
  return null;
}

/** Whose hand the active player takes from. Only meaningful while at least two seats hold cards. */
export function sourceOf(g: Pick<Game, "hands" | "turn">): number {
  return holderAfter(g.hands, g.turn) ?? g.turn;
}

function freshId(used: ReadonlySet<number>, randomInt: RandomInt): number {
  let id: number;
  do id = randomInt(1_000_000_000) + 1;
  while (used.has(id));
  return id;
}

const usedIds = (hands: readonly Slot[][]) => new Set(hands.flatMap((hand) => hand.map((s) => s.id)));

/** Cards are dealt round-robin; the seats that get the extra cards move along each round. */
function dealHands(players: number, round: number, randomInt: RandomInt): Slot[][] {
  const hands: Slot[][] = Array.from({ length: players }, () => []);
  const used = new Set<number>();
  shuffle(buildDeck(), randomInt).forEach((card, i) => {
    const id = freshId(used, randomInt);
    used.add(id);
    hands[(i + round - 1) % players].push({ id, card });
  });
  return hands;
}

function startRound(round: number, players: number, losses: number[], randomInt: RandomInt): Game {
  const first = (round - 1) % players;
  return settle({
    round,
    players,
    hands: dealHands(players, round, randomInt),
    pile: [],
    first,
    turn: first,
    step: "discard",
    lastMove: null,
    moves: 0,
    freshId: null,
    losses,
    summary: null,
    ready: Array(players).fill(false),
  });
}

export function newGame(randomInt: RandomInt, players: number): Game {
  if (!Number.isInteger(players) || players < MIN_PLAYERS || players > MAX_PLAYERS) {
    fail("Steal the Jack is played by two to six players.");
  }
  return startRound(1, players, Array(players).fill(0), randomInt);
}

/**
 * Ends the round once one seat is the only one holding cards. That last player still gets their turn
 * to discard pairs first: the round ends when they finish it. Called after every change.
 */
function settle(g: Game): Game {
  if (g.step === "summary") return g;
  const holders = g.hands.flatMap((hand, seat) => (hand.length > 0 ? [seat] : []));
  if (holders.length > 1) return g;
  if (holders.length === 1 && holders[0] === g.turn && (g.step === "pair" || g.step === "discard")) return g;
  // Cards only ever leave in pairs from an odd total, so someone always holds at least one.
  const loser = holders[0] ?? g.turn;
  return {
    ...g,
    step: "summary",
    freshId: null,
    losses: g.losses.map((n, seat) => (seat === loser ? n + 1 : n)),
    summary: { loser, hand: g.hands[loser].map((s) => s.card) },
    ready: Array(g.players).fill(false),
  };
}

function requireActive(g: Game, seat: number, steps: Step[], wrongStep: string) {
  if (g.step === "summary") fail("The round is over.");
  if (g.turn !== seat) fail("It's not your turn.");
  if (!steps.includes(g.step)) fail(wrongStep);
}

/** Hands the turn on: the next opener in the discard phase, then the next card holder clockwise. */
function endTurn(g: Game): Game {
  if (g.step === "discard") {
    const last = (g.first + g.players - 1) % g.players;
    if (g.turn !== last) return { ...g, turn: (g.turn + 1) % g.players, freshId: null };
    // The opening discards are done. Play starts with the first seat that still has cards.
    const start = isHolder(g, g.first) ? g.first : (holderAfter(g.hands, g.first) ?? g.first);
    return { ...g, step: "pick", turn: start, freshId: null };
  }
  return { ...g, step: "pick", turn: holderAfter(g.hands, g.turn) ?? g.turn, freshId: null };
}

/** Takes one card from the next player's hand, named by its slot id. */
export function pick(g: Game, seat: number, id: number, randomInt: RandomInt): Game {
  requireActive(g, seat, ["pick"], g.step === "discard" ? "Discard your pairs first." : "You've already taken a card this turn.");
  const from = sourceOf(g);
  const slot = g.hands[from].find((s) => s.id === id);
  if (!slot) fail("That card has already moved. Pick again.");

  // The card gets a new id in its new hand, so nobody can recognise it by the old one.
  const taken: Slot = { id: freshId(usedIds(g.hands), randomInt), card: slot.card };
  const hands = g.hands.map((hand, i) => (i === from ? hand.filter((s) => s.id !== id) : i === seat ? [...hand, taken] : hand));
  return settle({
    ...g,
    hands,
    step: "pair",
    freshId: taken.id,
    lastMove: { id: g.moves + 1, kind: "pick", seat, from },
    moves: g.moves + 1,
  });
}

/** Discards two cards of the same rank from the active player's hand. Neither phase forces a player to. */
export function discardPair(g: Game, seat: number, cards: readonly Card[]): Game {
  requireActive(g, seat, ["discard", "pair"], "Take a card first.");
  if (cards.length !== 2 || sameCard(cards[0], cards[1])) fail("Choose two different cards.");
  const slots = cards.map((card) => g.hands[seat].find((s) => sameCard(s.card, card)));
  if (!slots[0] || !slots[1]) fail("You don't hold those cards.");
  if (slots[0].card.rank !== slots[1].card.rank) fail("Those two aren't a pair.");

  const [a, b] = [slots[0], slots[1]];
  const hand = g.hands[seat].filter((s) => s.id !== a.id && s.id !== b.id);
  const next: Game = {
    ...g,
    hands: g.hands.map((h, i) => (i === seat ? hand : h)),
    pile: [...g.pile, a.card, b.card],
    freshId: g.freshId !== null && hand.some((s) => s.id === g.freshId) ? g.freshId : null,
    lastMove: { id: g.moves + 1, kind: "pair", seat, cards: [a.card, b.card] },
    moves: g.moves + 1,
  };
  // With nothing left to hold there is nothing to discard or pass on: the turn ends by itself.
  return settle(hand.length === 0 ? endTurn(next) : next);
}

/** The active player is finished discarding, with or without pairs left in hand. */
export function finishDiscarding(g: Game, seat: number): Game {
  requireActive(g, seat, ["discard", "pair"], "Take a card first.");
  return settle(endTurn(g));
}

/**
 * Rearranges your own hand. `order` lists slot ids left to right. Ids you no longer hold are ignored
 * and ids missing from the list keep their relative order at the end, so a card taken a moment
 * earlier can't make the request fail.
 */
export function arrange(g: Game, seat: number, order: readonly number[]): Game {
  if (g.step === "summary") fail("The round is over.");
  const hand = g.hands[seat];
  const byId = new Map(hand.map((s) => [s.id, s]));
  const next: Slot[] = [];
  for (const id of order) {
    const slot = byId.get(id);
    if (slot) {
      next.push(slot);
      byId.delete(id);
    }
  }
  next.push(...hand.filter((s) => byId.has(s.id)));
  return { ...g, hands: g.hands.map((h, i) => (i === seat ? next : h)) };
}

export function shuffleHand(g: Game, seat: number, randomInt: RandomInt): Game {
  if (g.step === "summary") fail("The round is over.");
  return { ...g, hands: g.hands.map((h, i) => (i === seat ? shuffle(h, randomInt) : h)) };
}

/** After a round everyone readies up for the next. Losses carry over; there is no last round. */
export function markReady(g: Game, seat: number, randomInt: RandomInt): Game {
  if (g.step !== "summary") fail("The round isn't over yet.");
  const ready = g.ready.map((r, i) => r || i === seat);
  if (!ready.every(Boolean)) return { ...g, ready };
  return startRound(g.round + 1, g.players, g.losses, randomInt);
}
