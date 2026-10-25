import { type Card, type RandomInt, SUITS, type Suit, sameCard, shuffle } from "@/lib/cards/cards";
import { fail } from "@/lib/cards/rules";
import { type TrickPlay, followCards, trickWinnerSeat } from "@/lib/cards/tricks";
import { buildDeck, handSizeFor, trumpFor } from "./deck";

/**
 * Authoritative Judgement rules. Everything here is pure: each action takes a Game and returns a
 * new Game, or throws a RuleError. Three to six seats play clockwise (ascending seat order). Each
 * round every player says how many hands they will win (their judgement), then the hands are played;
 * a player scores their judgement if they won exactly that many, and nothing otherwise. The last player
 * to judge may not call the number that makes the calls add up to the hands available, so someone always
 * misses. Rounds go on until the host ends the game.
 */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;

export type Step = "judge" | "play" | "trickDone" | "summary" | "final";

export type { TrickPlay };
export { followCards as legalCards };

/** What happened in one finished round, kept for the round-by-round breakdown. */
export interface RoundRecord {
  round: number;
  trump: Suit;
  hands: number;
  starter: number;
  judgements: number[];
  wins: number[];
  points: number[];
}

export interface Game {
  round: number;
  players: number;
  /** Cards each player is dealt, which is also the number of hands in the round. */
  handSize: number;
  hands: Card[][];
  trump: Suit;
  /** Seat that makes the first judgement and leads the first hand; moves one seat on every round. */
  starter: number;
  /** Each seat's judgement, null until they have made it. */
  judgements: (number | null)[];
  turn: number;
  trick: TrickPlay[];
  trickWinner: number | null;
  tricksPlayed: number;
  wins: number[];
  step: Step;
  scores: number[];
  history: RoundRecord[];
  ready: boolean[];
}

const nextSeat = (g: Pick<Game, "players">, seat: number) => (seat + 1) % g.players;

/** Points for a round: a player's judgement if they won exactly that many hands, otherwise nothing. */
export const pointsFor = (judgement: number, won: number) => (judgement === won ? judgement : 0);

/**
 * The one number the player judging now may not call: the one that would make every call add up to the
 * hands in the round. Only the last player to judge is restricted, and only when that number is in range.
 */
export function forbiddenJudgement(game: Pick<Game, "judgements" | "handSize">): number | null {
  const made = game.judgements.filter((j): j is number => j !== null);
  if (made.length !== game.judgements.length - 1) return null;
  const blocked = game.handSize - made.reduce((sum, j) => sum + j, 0);
  return blocked >= 0 && blocked <= game.handSize ? blocked : null;
}

/** Seats holding the top score: more than one when the game ends level. */
export function leaders(scores: readonly number[]): number[] {
  const best = Math.max(...scores);
  return scores.flatMap((s, i) => (s === best ? [i] : []));
}

// ------------------------------------------------------------------- set-up

function dealRound(round: number, players: number, scores: number[], history: RoundRecord[], randomInt: RandomInt): Game {
  const deck = shuffle(buildDeck(), randomInt);
  const handSize = handSizeFor(round, players);
  const starter = (round - 1) % players;
  return {
    round,
    players,
    handSize,
    hands: Array.from({ length: players }, (_, seat) => deck.slice(seat * handSize, (seat + 1) * handSize)),
    trump: trumpFor(round),
    starter,
    judgements: Array(players).fill(null),
    turn: starter,
    trick: [],
    trickWinner: null,
    tricksPlayed: 0,
    wins: Array(players).fill(0),
    step: "judge",
    scores,
    history,
    ready: Array(players).fill(false),
  };
}

export function newGame(randomInt: RandomInt, players: number): Game {
  if (!Number.isInteger(players) || players < MIN_PLAYERS || players > MAX_PLAYERS) {
    fail("Judgement is played by three to six players.");
  }
  return dealRound(1, players, Array(players).fill(0), [], randomInt);
}

// ------------------------------------------------------------------ actions

/** Say how many hands you will win. Judgements go round the table from the starter, one each. */
export function judge(game: Game, seat: number, count: unknown): Game {
  if (game.step !== "judge") fail("Judgements are closed.");
  if (game.turn !== seat) fail("It isn't your turn to judge.");
  if (typeof count !== "number" || !Number.isInteger(count) || count < 0 || count > game.handSize) {
    fail(`Judge a whole number from 0 to ${game.handSize}.`);
  }
  if (count === forbiddenJudgement(game)) {
    fail(`As the last to judge you can't call ${count}: the calls can't add up to ${game.handSize}.`);
  }
  const judgements = game.judgements.map((j, i) => (i === seat ? count : j));
  if (judgements.every((j) => j !== null)) {
    return { ...game, judgements, step: "play", turn: game.starter };
  }
  return { ...game, judgements, turn: nextSeat(game, seat) };
}

export function playCard(game: Game, seat: number, card: Card): Game {
  if (game.step !== "play") fail("Cards can't be played right now.");
  if (game.turn !== seat) fail("It isn't your turn.");
  const hand = game.hands[seat];
  const held = hand.find((c) => sameCard(c, card));
  if (!held) fail("That card isn't in your hand.");
  if (!followCards(hand, game.trick).some((c) => sameCard(c, held))) {
    fail("You must follow the suit that was led.");
  }

  const hands = game.hands.map((h, i) => (i === seat ? h.filter((c) => !sameCard(c, held)) : h));
  const trick = [...game.trick, { seat, card: held }];
  if (trick.length < game.players) return { ...game, hands, trick, turn: nextSeat(game, seat) };

  const winner = trickWinnerSeat(trick, game.trump);
  return {
    ...game,
    hands,
    trick,
    trickWinner: winner,
    wins: game.wins.map((w, i) => (i === winner ? w + 1 : w)),
    step: "trickDone",
  };
}

/** Clears a finished hand; the winner leads next, or the round is scored after the last hand. */
export function collectTrick(game: Game): Game {
  if (game.step !== "trickDone" || game.trickWinner === null) fail("No hand to collect.");
  const tricksPlayed = game.tricksPlayed + 1;
  const base = { ...game, trick: [], trickWinner: null, tricksPlayed };
  if (tricksPlayed < game.handSize) return { ...base, step: "play", turn: game.trickWinner };

  const judgements = game.judgements as number[];
  const points = judgements.map((j, seat) => pointsFor(j, game.wins[seat]));
  const record: RoundRecord = {
    round: game.round,
    trump: game.trump,
    hands: game.handSize,
    starter: game.starter,
    judgements,
    wins: game.wins,
    points,
  };
  return {
    ...base,
    step: "summary",
    scores: game.scores.map((s, i) => s + points[i]),
    history: [...game.history, record],
    ready: Array(game.players).fill(false),
  };
}

/** After a round everyone readies up for the next. After the host ends the game, readying starts a fresh one. */
export function markReady(game: Game, seat: number, randomInt: RandomInt): Game {
  if (game.step !== "summary" && game.step !== "final") fail("The round isn't over yet.");
  const ready = game.ready.map((r, i) => r || i === seat);
  if (!ready.every(Boolean)) return { ...game, ready };
  return game.step === "final"
    ? newGame(randomInt, game.players)
    : dealRound(game.round + 1, game.players, game.scores, game.history, randomInt);
}

/** The host closes the session from the round summary. */
export function endGame(game: Game, seat: number): Game {
  if (seat !== 0) fail("Only the host can end the game.");
  if (game.step !== "summary") fail("A game can be ended between rounds.");
  return { ...game, step: "final", ready: Array(game.players).fill(false) };
}
