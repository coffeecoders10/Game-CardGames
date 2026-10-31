import type { Metadata } from "next";
import { GameStealTheJackHome } from "@/games/stealthejack/components/GameStealTheJackHome";

export const metadata: Metadata = {
  title: "Steal the Jack",
  description: "A card game for two to six. Pair off your cards and don't get stuck with the last Jack.",
};

export default function Page() {
  return <GameStealTheJackHome />;
}
