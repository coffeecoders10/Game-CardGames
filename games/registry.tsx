import type { ReactNode } from "react";
import type { Card } from "@/lib/cards/cards";
import { Emblem532 } from "./532/components/Emblem532";
import { Emblem78 } from "./78/components/Emblem78";
import { Emblem7Hearts } from "./7hearts/components/Emblem7Hearts";
import { EmblemJudgement } from "./judgement/components/EmblemJudgement";
import { EmblemStealTheJack } from "./stealthejack/components/EmblemStealTheJack";

export interface GameInfo {
  /** Route segment: the game lives at `/games/<slug>`. */
  slug: string;
  title: string;
  /** One line that sells the game on its hub tile. */
  tagline: string;
  /** Short facts shown as chips on the tile, e.g. "3 players". */
  facts: string[];
  /** Small emblem for the hub tile. */
  emblem: ReactNode;
  /** A few cards that say what the game is about, fanned on the hub tile. */
  cards: Card[];
}

/**
 * Every game in the hub. To add a game: build it under `games/<slug>/`, add its routes under
 * `app/games/<slug>/`, and append an entry here. The hub page picks it up automatically.
 */
export const GAMES: GameInfo[] = [
  {
    slug: "532",
    title: "5-3-2",
    tagline: "Win what you promised, then trade for the rest.",
    facts: ["3 players", "Online"],
    emblem: <Emblem532 size="clamp(52px, 14vw, 68px)" />,
    cards: [
      { suit: "S", rank: 5 },
      { suit: "H", rank: 3 },
      { suit: "D", rank: 2 },
    ],
  },
  {
    slug: "78",
    title: "7-8",
    tagline: "Win your number, and take the rest from the other side.",
    facts: ["2 players", "Online"],
    emblem: <Emblem78 size="clamp(52px, 14vw, 68px)" />,
    cards: [
      { suit: "C", rank: 7 },
      { suit: "D", rank: 8 },
    ],
  },
  {
    slug: "7hearts",
    title: "7 of Hearts",
    tagline: "Build every suit out from the seven, and be first to empty your hand.",
    facts: ["3–5 players", "Online"],
    emblem: <Emblem7Hearts size="clamp(52px, 14vw, 68px)" />,
    cards: [
      { suit: "H", rank: 6 },
      { suit: "H", rank: 7 },
      { suit: "H", rank: 8 },
    ],
  },
  {
    slug: "judgement",
    title: "Judgement",
    tagline: "Call your hands before you play, then win exactly that many.",
    facts: ["3–6 players", "Online"],
    emblem: <EmblemJudgement size="clamp(52px, 14vw, 68px)" />,
    cards: [
      { suit: "S", rank: 14 },
      { suit: "S", rank: 13 },
      { suit: "H", rank: 12 },
    ],
  },
  {
    slug: "stealthejack",
    title: "Steal the Jack",
    tagline: "Pair off your cards, and don't get stuck with the last Jack.",
    facts: ["2–6 players", "Online"],
    emblem: <EmblemStealTheJack size="clamp(52px, 14vw, 68px)" />,
    cards: [
      { suit: "S", rank: 11 },
      { suit: "H", rank: 11 },
      { suit: "C", rank: 11 },
    ],
  },
];

export const gameHref = (game: GameInfo) => `/games/${game.slug}`;
