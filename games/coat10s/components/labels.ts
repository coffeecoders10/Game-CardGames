import { type Team, TEAM_NAMES } from "@/games/coat10s/game/engine";

export const TEAM_LETTER = ["A", "B"] as const;

/** A player's place in their team, e.g. "A2": team letter and line-up number. */
export function posLabel(teams: readonly [number[], number[]], seat: number): string {
  const team: Team = teams[0].includes(seat) ? 0 : 1;
  return `${TEAM_LETTER[team]}${teams[team].indexOf(seat) + 1}`;
}

export const teamName = (team: Team) => TEAM_NAMES[team];
