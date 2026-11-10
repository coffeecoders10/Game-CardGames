import { createStorage } from "@/lib/net/storage";
import type { TableAdapter } from "@/lib/net/useTable";
import { type Game, PLAYER_COUNTS, begin, collectTrick, endGame, markReady, moveToTeam, newGame, playCard } from "../game/engine";
import { type GameView, gameViewFor } from "../game/view";
import { roomIdFor } from "./config";
import { type GameAction, parseGameAction } from "./protocol";

/** How long a finished hand stays on the table before it is swept to the winner. */
export const TRICK_PAUSE_MS = 2300;

export const storageCoat10s = createStorage("coat10scards");

/** Plugs the Coat of 10s rules into the shared host/guest sessions. */
export const adapterCoat10s: TableAdapter<Game, GameView, GameAction> = {
  roomId: roomIdFor,
  storage: storageCoat10s,
  engine: {
    seats: 8,
    minSeats: 4,
    allowedSeats: PLAYER_COUNTS,
    startError: "Coat of 10s needs exactly four, six or eight players.",
    newGame,
    act(game, seat, action, randomInt) {
      switch (action.type) {
        case "team":
          return moveToTeam(game, seat, action.seat, action.team);
        case "begin":
          return begin(game, seat, randomInt);
        case "play":
          return playCard(game, seat, action.card);
        case "ready":
          return markReady(game, seat, randomInt);
        case "end":
          return endGame(game, seat);
      }
    },
    view: gameViewFor,
    parseAction: parseGameAction,
    auto: (game) => (game.step === "trickDone" ? { delayMs: TRICK_PAUSE_MS, run: collectTrick } : null),
  },
};
