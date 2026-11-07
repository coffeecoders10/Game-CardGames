"use client";

import type { Card } from "@/lib/cards/cards";
import { GameHome } from "@/components/table/GameHome";
import { storageCoat10s } from "@/games/coat10s/net/table";
import { EmblemCoat10s } from "./EmblemCoat10s";

/** A sample hand: the four 10s, the whole point of the game. */
const FAN: Card[] = [
  { suit: "S", rank: 10 },
  { suit: "H", rank: 10 },
  { suit: "D", rank: 10 },
  { suit: "C", rank: 10 },
];

/** Landing page for Coat of 10s. */
export function GameCoat10sHome() {
  return (
    <GameHome
      slug="coat10s"
      name="Coat of 10s"
      emblem={<EmblemCoat10s animated />}
      tagline="Four or six players in two teams. Capture all four 10s to win a coat."
      fan={FAN}
      storage={storageCoat10s}
    />
  );
}
