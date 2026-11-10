"use client";

import type { Card } from "@/lib/cards/cards";
import { GameHome } from "@/components/table/GameHome";
import { storage7hearts } from "@/games/7hearts/net/table";
import { Emblem7Hearts } from "./Emblem7Hearts";

/** A sample run: the opening 7 of Hearts with its neighbours and the other three 7s. */
const FAN: Card[] = [
  { suit: "H", rank: 6 },
  { suit: "H", rank: 7 },
  { suit: "S", rank: 7 },
  { suit: "D", rank: 7 },
  { suit: "C", rank: 7 },
];

/** Landing page for 7 of Hearts. */
export function Game7HeartsHome() {
  return (
    <GameHome
      slug="7hearts"
      name="7 of Hearts"
      emblem={<Emblem7Hearts animated />}
      tagline="Three to ten players. Build every suit out from the seven, and be first to empty your hand."
      fan={FAN}
      storage={storage7hearts}
    />
  );
}
