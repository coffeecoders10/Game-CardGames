import { createStorage } from "@/lib/net/storage";
import type { TableAdapter } from "@/lib/net/useTable";
import {
  type Game,
  MAX_PLAYERS,
  MIN_PLAYERS,
  arrange,
  discardPair,
  finishDiscarding,
  markReady,
  newGame,
  pick,
  shuffleHand,
} from "../game/engine";
import { type GameView, gameViewFor } from "../game/view";
import { roomIdFor } from "./config";
import { type GameAction, parseGameAction } from "./protocol";

export const storageStealTheJack = createStorage("stealthejackcards");

/** Plugs the Steal the Jack rules into the shared host/guest sessions. */
export const adapterStealTheJack: TableAdapter<Game, GameView, GameAction> = {
  roomId: roomIdFor,
  storage: storageStealTheJack,
  engine: {
    seats: MAX_PLAYERS,
    minSeats: MIN_PLAYERS,
    startError: "At least two players are needed.",
    newGame,
    act(game, seat, action, randomInt) {
      switch (action.type) {
        case "pick":
          return pick(game, seat, action.id, randomInt);
        case "pair":
          return discardPair(game, seat, action.cards);
        case "done":
          return finishDiscarding(game, seat);
        case "arrange":
          return arrange(game, seat, action.order);
        case "shuffle":
          return shuffleHand(game, seat, randomInt);
        case "ready":
          return markReady(game, seat, randomInt);
      }
    },
    view: gameViewFor,
    parseAction: parseGameAction,
  },
};
