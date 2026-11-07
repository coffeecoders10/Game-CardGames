import type { Metadata } from "next";
import { GameCoat10sHome } from "@/games/coat10s/components/GameCoat10sHome";

export const metadata: Metadata = {
  title: "Coat of 10s",
  description: "A team trick-taking game for four or six. Capture all four 10s to win a coat.",
};

export default function Page() {
  return <GameCoat10sHome />;
}
