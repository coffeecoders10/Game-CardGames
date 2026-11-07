import { type Card, type RandomInt, type Suit, sameCard, shuffle } from "@/lib/cards/cards";
import { fail } from "@/lib/cards/rules";
import { type TrickPlay, followCards } from "@/lib/cards/tricks";
import { buildDeck, handSizeFor, isTen } from "./deck";

/**
 * Authoritative Coat of 10s rules. Everything here is pure: each action takes a Game and returns a new
 * Game, or throws a RuleError. Four or six players in two teams sit in alternating order (A1 B1 A2 B2 ...).
 * A team that captures all four 10s in a round earns a coat; coats are a persistent net balance.
 * Seats are table seats (0 is the host); `order` is the fixed circular playing order.
 */

export const PLAYER_COUNTS = [4, 6] as const;

export type Team = 0 | 1;
export type Step = "teams" | "play" | "trickDone" | "summary" | "final";
/** Why the next round's starting team was chosen. */
export type StartReason = "coats" | "tens" | "hands" | "tie";

export type { TrickPlay };
export { followCards as legalCards };

export const TEAM_NAMES = ["Team A", "Team B"] as const;
export const otherTeam = (t: Team): Team => (t === 0 ? 1 : 0);

/** Who opens a round and why. Decided once, when a round ends. */
export interface StartPlan {
  team: Team;
  seat: number;
  reason: StartReason;
}

export interface RoundRecord {
  round: number;
  trump: Suit | null;
  hands: number;
  /** Seat that opened the round. */
  starter: number;
  /** 10s captured by each team this round. */
  tens: [Card[], Card[]];
  handsWon: [number, number];
  /** The team that performed better by 10s, then hands; null on a complete tie. */
  better: Team | null;
  /** The team that took all four 10s. */
  coatFor: Team | null;
  /** Coats each team holds after this round (never both above zero). */
  coats: [number, number];
  next: StartPlan;
}

export interface Game {
  players: number;
  step: Step;
  /** Seats of each team in team order (A1, A2, ...). Free to change while step is "teams". */
  teams: [number[], number[]];
  /** Fixed circular playing order, alternating teams. Empty until the teams are locked in. */
  order: number[];
  round: number;
  handSize: number;
  hands: Card[][];
  /** Null until the first legal off-suit play of the round. */
  trump: Suit | null;
  trumpBy: number | null;
  /** Seat that opened this round. */
  starter: number;
  /** Team the starter belongs to; the fallback when a round ties completely. */
  startTeam: Team;
  turn: number;
  trick: TrickPlay[];
  trickWinner: number | null;
  /** Winner of the hand before the one on the table, once there has been one this round. */
  lastWinner: number | null;
  tricksPlayed: number;
  /** Captured 10s and hands won this round, per team. */
  tens: [Card[], Card[]];
  handsWon: [number, number];
  /** Signed coat balance: above zero is Team A's lead, below zero is Team B's. */
  coat: number;
  /** Each team's next starting seat in its own rotation. */
  rotation: [number, number];
  /** Set when a round ends: who opens the next one. */
  next: StartPlan | null;
  history: RoundRecord[];
  ready: boolean[];
}

// ----------------------------------------------------------------- helpers

export const teamOf = (g: Pick<Game, "teams">, seat: number): Team => (g.teams[0].includes(seat) ? 0 : 1);

/** The seat after `seat` in the circular playing order. */
export function nextInOrder(order: readonly number[], seat: number): number {
  return order[(order.indexOf(seat) + 1) % order.length];
}

/** Alternate the teams' members: A1, B1, A2, B2, ... */
export const interleave = (teams: readonly [number[], number[]]): number[] =>
  teams[0].flatMap((a, i) => [a, teams[1][i]]);

/** Coats each team holds, from the signed balance. */
export const coatsOf = (balance: number): [number, number] => [Math.max(balance, 0), Math.max(-balance, 0)];

/** Highest trump if any trump was played, else highest of the led suit. Trump may be undetermined. */
export function winnerSeat(trick: readonly TrickPlay[], trump: Suit | null): number {
  const led = trick[0].card.suit;
  const beats = (a: Card, b: Card) => {
    const aTrump = trump !== null && a.suit === trump;
    const bTrump = trump !== null && b.suit === trump;
    if (aTrump !== bTrump) return aTrump;
    if (a.suit !== b.suit) return a.suit === led;
    return a.rank > b.rank;
  };
  let best = trick[0];
  for (const play of trick.slice(1)) if (beats(play.card, best.card)) best = play;
  return best.seat;
}

/** The team that did better in a round: more 10s, then (on 2-2) more hands; null if level on both. */
export function betterTeam(tens: [number, number], hands: [number, number]): Team | null {
  if (tens[0] !== tens[1]) return tens[0] > tens[1] ? 0 : 1;
  if (hands[0] !== hands[1]) return hands[0] > hands[1] ? 0 : 1;
  return null;
}

/** Which team opens the next round and why: active coats first, then 10s, then hands, then the last opener's team. */
export function startingTeam(
  coat: number,
  tens: [number, number],
  hands: [number, number],
  previous: Team,
): { team: Team; reason: StartReason } {
  if (coat !== 0) return { team: coat > 0 ? 0 : 1, reason: "coats" };
  if (tens[0] !== tens[1]) return { team: tens[0] > tens[1] ? 0 : 1, reason: "tens" };
  if (hands[0] !== hands[1]) return { team: hands[0] > hands[1] ? 0 : 1, reason: "hands" };
  return { team: previous, reason: "tie" };
}

// ------------------------------------------------------------------ set-up

export function newGame(_randomInt: RandomInt, players: number): Game {
  if (!(PLAYER_COUNTS as readonly number[]).includes(players)) fail("Coat of 10s is played by four or six players.");
  const seats = Array.from({ length: players }, (_, i) => i);
  return {
    players,
    step: "teams",
    // A sensible start the host can rearrange: alternate the seats.
    teams: [seats.filter((s) => s % 2 === 0), seats.filter((s) => s % 2 === 1)],
    order: [],
    round: 0,
    handSize: handSizeFor(players),
    hands: seats.map(() => []),
    trump: null,
    trumpBy: null,
    starter: 0,
    startTeam: 0,
    turn: 0,
    trick: [],
    trickWinner: null,
    lastWinner: null,
    tricksPlayed: 0,
    tens: [[], []],
    handsWon: [0, 0],
    coat: 0,
    rotation: [0, 0],
    next: null,
    history: [],
    ready: seats.map(() => false),
  };
}

function dealRound(g: Game, round: number, plan: StartPlan, randomInt: RandomInt): Game {
  const deck = shuffle(buildDeck(g.players), randomInt);
  const size = g.handSize;
  return {
    ...g,
    step: "play",
    round,
    hands: Array.from({ length: g.players }, (_, seat) => deck.slice(seat * size, (seat + 1) * size)),
    trump: null,
    trumpBy: null,
    starter: plan.seat,
    startTeam: plan.team,
    turn: plan.seat,
    trick: [],
    trickWinner: null,
    lastWinner: null,
    tricksPlayed: 0,
    tens: [[], []],
    handsWon: [0, 0],
    next: null,
    ready: Array(g.players).fill(false),
  };
}

// --------------------------------------------------------------- team setup

function requireSetup(g: Game, actor: number) {
  if (actor !== 0) fail("Only the host can arrange the teams.");
  if (g.step !== "teams") fail("The teams are already locked in.");
}

/** Move a player onto a team (at the end of its line-up). Sizes are checked when the host starts. */
export function moveToTeam(g: Game, actor: number, who: unknown, team: unknown): Game {
  requireSetup(g, actor);
  if (typeof who !== "number" || !Number.isInteger(who) || who < 0 || who >= g.players) fail("No such player.");
  if (team !== 0 && team !== 1) fail("No such team.");
  if (g.teams[team].includes(who)) return g;
  const teams = g.teams.map((t, i) => (i === team ? [...t, who] : t.filter((s) => s !== who))) as [number[], number[]];
  return { ...g, teams };
}

/** A message when the teams aren't the right size to start, otherwise null. */
export function teamProblem(g: Pick<Game, "teams" | "players">): string | null {
  const each = g.players / 2;
  if (g.teams[0].length !== each || g.teams[1].length !== each) {
    return `Each team needs exactly ${each} players (now ${g.teams[0].length} and ${g.teams[1].length}).`;
  }
  return null;
}

/** The host locks the teams, fixes the alternating order and deals round 1 to a randomly chosen opener. */
export function begin(g: Game, actor: number, randomInt: RandomInt): Game {
  requireSetup(g, actor);
  const problem = teamProblem(g);
  if (problem) fail(problem);
  // Seating is random: shuffle each team's line-up, then alternate teams round the table.
  const teams: [number[], number[]] = [shuffle(g.teams[0], randomInt), shuffle(g.teams[1], randomInt)];
  g = { ...g, teams };
  const order = interleave(teams);
  const starter = order[randomInt(order.length)];
  const team = teamOf(g, starter);
  // The opener's team rotates on from them; the other team starts from the first of them after the opener.
  const mates = g.teams[team];
  const rotation: [number, number] = [0, 0];
  rotation[team] = mates[(mates.indexOf(starter) + 1) % mates.length];
  rotation[otherTeam(team)] = nextInOrder(order, starter);
  return dealRound({ ...g, order, rotation, coat: 0, history: [] }, 1, { team, seat: starter, reason: "tie" }, randomInt);
}

// ------------------------------------------------------------------ actions

export function playCard(g: Game, seat: number, card: Card): Game {
  if (g.step !== "play") fail("Cards can't be played right now.");
  if (g.turn !== seat) fail("It isn't your turn.");
  const hand = g.hands[seat];
  const held = hand.find((c) => sameCard(c, card));
  if (!held) fail("That card isn't in your hand.");
  if (!followCards(hand, g.trick).some((c) => sameCard(c, held))) fail("You must follow the suit that was led.");

  const hands = g.hands.map((h, i) => (i === seat ? h.filter((c) => !sameCard(c, held)) : h));
  const trick = [...g.trick, { seat, card: held }];
  // The first legal off-suit card of the round names trump, straight away.
  const names = g.trump === null && trick.length > 1 && held.suit !== trick[0].card.suit;
  const trump = names ? held.suit : g.trump;
  const trumpBy = names ? seat : g.trumpBy;
  if (trick.length < g.players) return { ...g, hands, trick, trump, trumpBy, turn: nextInOrder(g.order, seat) };

  const winner = winnerSeat(trick, trump);
  const team = teamOf(g, winner);
  const taken = trick.map((p) => p.card).filter(isTen);
  const tens = g.tens.map((t, i) => (i === team ? [...t, ...taken] : t)) as [Card[], Card[]];
  const handsWon = g.handsWon.map((n, i) => (i === team ? n + 1 : n)) as [number, number];
  return { ...g, hands, trick, trump, trumpBy, trickWinner: winner, tens, handsWon, step: "trickDone" };
}

/** Clears a finished hand; the winner leads next, or the round is scored after the last hand. */
export function collectTrick(g: Game): Game {
  if (g.step !== "trickDone" || g.trickWinner === null) fail("No hand to collect.");
  const tricksPlayed = g.tricksPlayed + 1;
  const base = { ...g, trick: [], trickWinner: null, lastWinner: g.trickWinner, tricksPlayed };
  if (tricksPlayed < g.handSize) return { ...base, step: "play" as const, turn: g.trickWinner };
  return finishRound(base);
}

/** Scores the round once: coats, the better team, and who opens the next round. */
function finishRound(g: Game): Game {
  const count: [number, number] = [g.tens[0].length, g.tens[1].length];
  const better = betterTeam(count, g.handsWon);
  const coatFor: Team | null = count[0] === 4 ? 0 : count[1] === 4 ? 1 : null;
  // A coat adds to the holder's stack, or removes one of the other team's.
  const coat = coatFor === null ? g.coat : g.coat + (coatFor === 0 ? 1 : -1);

  const { team, reason } = startingTeam(coat, count, g.handsWon, g.startTeam);
  const seat = g.rotation[team];
  const mates = g.teams[team];
  const rotation = [...g.rotation] as [number, number];
  rotation[team] = mates[(mates.indexOf(seat) + 1) % mates.length];
  const next: StartPlan = { team, seat, reason };

  const record: RoundRecord = {
    round: g.round,
    trump: g.trump,
    hands: g.handSize,
    starter: g.starter,
    tens: g.tens,
    handsWon: g.handsWon,
    better,
    coatFor,
    coats: coatsOf(coat),
    next,
  };
  return {
    ...g,
    step: "summary",
    coat,
    rotation,
    next,
    history: [...g.history, record],
    ready: Array(g.players).fill(false),
  };
}

/** After a round everyone readies up for the next. After the host ends the match, readying starts a fresh one. */
export function markReady(g: Game, seat: number, randomInt: RandomInt): Game {
  if (g.step !== "summary" && g.step !== "final") fail("The round isn't over yet.");
  const ready = g.ready.map((r, i) => r || i === seat);
  if (!ready.every(Boolean)) return { ...g, ready };
  if (g.step === "final" || !g.next) return newGame(randomInt, g.players);
  return dealRound(g, g.round + 1, g.next, randomInt);
}

/** The host closes the match from the round summary. */
export function endGame(g: Game, seat: number): Game {
  if (seat !== 0) fail("Only the host can end the game.");
  if (g.step !== "summary") fail("A game can be ended between rounds.");
  return { ...g, step: "final", ready: Array(g.players).fill(false) };
}
