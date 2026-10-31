"use client";

import type { Card } from "@/lib/cards/cards";
import { GameHome } from "@/components/table/GameHome";
import { storageStealTheJack } from "@/games/stealthejack/net/table";
import { EmblemStealTheJack } from "./EmblemStealTheJack";

/** A sample run: the three Jacks that can be matched, and the one that can't. */
const FAN: Card[] = [
  { suit: "S", rank: 11 },
  { suit: "H", rank: 11 },
  { suit: "C", rank: 11 },
];

/** Landing page for Steal the Jack. */
export function GameStealTheJackHome() {
  return (
    <GameHome
      slug="stealthejack"
      name="Steal the Jack"
      emblem={<EmblemStealTheJack animated />}
      tagline="Two to six players. Pair off your cards and don't get stuck with the last Jack."
      fan={FAN}
      storage={storageStealTheJack}
    />
  );
}
