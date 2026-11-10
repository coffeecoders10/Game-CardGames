import { type Card, type RandomInt, type Suit, sameCard, shuffle } from "@/lib/cards/cards";
import { fail } from "@/lib/cards/rules";
import { buildDeck } from "./deck";

/**
 * Authoritative 7 of Hearts rules. Everything here is pure: each action takes a Game and returns
 * a new Game, or throws a RuleError. Three to ten seats play clockwise (seat order), with a second deck (and eight lanes) from seven players; the holder of
 * the 7 of Hearts opens every round. Whoever empties their hand first ends the round; everyone
 * else scores the value of the cards they still hold. Lowest total after seven rounds wins.
 */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const ROUNDS = 7;

export type Step = "play" | "summary";

/** Sequence position of a card: Ace is 1 (low), King is 13 (high). There is no wrap-around. */
export const valueOf = (card: Card) => (card.rank === 14 ? 1 : card.rank);

/** Penalty points a card costs when it is left in your hand: its value, Ace 1 to King 13. */
export const penaltyOf = valueOf;

/** The stretch of a suit that is on the table, as values from `low` to `high` inclusive. */
export interface Run {
  low: number;
  high: number;
}
/**
 * One lane per suit per deck: 4 lanes with one deck, 8 with two. Lane `i` holds suit `LANE_SUITS[i % 4]`.
 * Duplicate cards are interchangeable, so a card goes on the first lane of its suit that accepts it.
 */
export type Board = (Run | null)[];

export const LANE_SUITS: readonly Suit[] = ["H", "S", "D", "C"];
export const laneSuit = (lane: number): Suit => LANE_SUITS[lane % LANE_SUITS.length];

/** Seven or more players share two decks. */
export const decksFor = (players: number) => (players > 6 ? 2 : 1);

/** A card played, or a pass (`card: null`). `id` grows with every move so the UI can tell them apart. */
export interface Move {
  id: number;
  seat: number;
  card: Card | null;
}

export interface RoundSummary {
  /** Seat that went out first. */
  winner: number;
  /** Points each seat took this round. */
  penalties: number[];
  /** What each seat was still holding: public once the round is over. */
  leftover: Card[][];
}

export interface Game {
  round: number;
  players: number;
  hands: Card[][];
  board: Board;
  turn: number;
  step: Step;
  lastMove: Move | null;
  moves: number;
  /** Running penalty total per seat. */
  scores: number[];
  /** Points each seat took in every finished round. */
  history: number[][];
  summary: RoundSummary | null;
  ready: boolean[];
}

const OPENER: Card = { suit: "H", rank: 7 };

const emptyBoard = (players: number): Board => Array(LANE_SUITS.length * decksFor(players)).fill(null);
export const isBoardEmpty = (board: Board) => board.every((run) => run === null);

/** The lane a card would go on, or -1 if it fits nowhere. */
export function laneFor(board: Board, card: Card): number {
  if (isBoardEmpty(board)) return sameCard(card, OPENER) ? LANE_SUITS.indexOf(card.suit) : -1;
  const value = valueOf(card);
  return board.findIndex((run, i) => {
    if (laneSuit(i) !== card.suit) return false;
    return run ? value === run.low - 1 || value === run.high + 1 : value === 7;
  });
}

/** Whether a card could go on the table right now, ignoring whose turn it is. */
export const isPlayable = (board: Board, card: Card): boolean => laneFor(board, card) >= 0;

export const legalCards = (board: Board, hand: readonly Card[]): Card[] => hand.filter((c) => isPlayable(board, c));

/** Cards are dealt round-robin; the seats that get the extra cards move along each round. */
function dealHands(players: number, round: number, randomInt: RandomInt): Card[][] {
  const hands: Card[][] = Array.from({ length: players }, () => []);
  const cards = Array.from({ length: decksFor(players) }, buildDeck).flat();
  shuffle(cards, randomInt).forEach((card, i) => hands[(i + round - 1) % players].push(card));
  return hands;
}

function startRound(round: number, players: number, scores: number[], history: number[][], randomInt: RandomInt): Game {
  const hands = dealHands(players, round, randomInt);
  const opener = hands.findIndex((hand) => hand.some((c) => sameCard(c, OPENER)));
  return {
    round,
    players,
    hands,
    board: emptyBoard(players),
    turn: opener,
    step: "play",
    lastMove: null,
    moves: 0,
    scores,
    history,
    summary: null,
    ready: Array(players).fill(false),
  };
}

export function newGame(randomInt: RandomInt, players: number): Game {
  if (!Number.isInteger(players) || players < MIN_PLAYERS || players > MAX_PLAYERS) {
    fail("7 of Hearts is played by three to ten players.");
  }
  return startRound(1, players, Array(players).fill(0), [], randomInt);
}

function requireTurn(g: Game, seat: number) {
  if (g.step !== "play") fail("The round is over.");
  if (g.turn !== seat) fail("It's not your turn.");
}

export function playCard(g: Game, seat: number, card: Card): Game {
  requireTurn(g, seat);
  const held = g.hands[seat].find((c) => sameCard(c, card));
  if (!held) fail("You don't hold that card.");
  if (!isPlayable(g.board, held)) {
    fail(isBoardEmpty(g.board) ? "The round opens with the 7 of Hearts." : "That card doesn't fit on the table yet.");
  }

  const value = valueOf(held);
  const lane = laneFor(g.board, held);
  const run = g.board[lane];
  const board: Board = g.board.map((r, i) =>
    i !== lane ? r : run ? { low: Math.min(run.low, value), high: Math.max(run.high, value) } : { low: value, high: value },
  );
  const hands = g.hands.map((h, i) => (i === seat ? h.filter((c) => !sameCard(c, held)) : h));
  const next: Game = {
    ...g,
    hands,
    board,
    lastMove: { id: g.moves + 1, seat, card: held },
    moves: g.moves + 1,
  };
  return hands[seat].length === 0 ? finishRound(next, seat) : { ...next, turn: (seat + 1) % g.players };
}

/** Passing is only for a player with nothing to play. */
export function pass(g: Game, seat: number): Game {
  requireTurn(g, seat);
  if (legalCards(g.board, g.hands[seat]).length > 0) fail("You have a card you can play.");
  return {
    ...g,
    turn: (seat + 1) % g.players,
    lastMove: { id: g.moves + 1, seat, card: null },
    moves: g.moves + 1,
  };
}

function finishRound(g: Game, winner: number): Game {
  const penalties = g.hands.map((hand) => hand.reduce((sum, c) => sum + penaltyOf(c), 0));
  return {
    ...g,
    step: "summary",
    scores: g.scores.map((s, i) => s + penalties[i]),
    history: [...g.history, penalties],
    summary: { winner, penalties, leftover: g.hands },
    ready: Array(g.players).fill(false),
  };
}

/** Seats with the lowest total: more than one when the game ends level. */
export function leaders(scores: readonly number[]): number[] {
  const best = Math.min(...scores);
  return scores.flatMap((s, i) => (s === best ? [i] : []));
}

/** After a round everyone readies up for the next; after the seventh, readying starts a fresh game. */
export function markReady(g: Game, seat: number, randomInt: RandomInt): Game {
  if (g.step !== "summary") fail("The round isn't over yet.");
  const ready = g.ready.map((r, i) => r || i === seat);
  if (!ready.every(Boolean)) return { ...g, ready };
  return g.round < ROUNDS
    ? startRound(g.round + 1, g.players, g.scores, g.history, randomInt)
    : newGame(randomInt, g.players);
}
