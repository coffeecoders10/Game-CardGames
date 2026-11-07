import { PlayingCard } from "@/components/cards/PlayingCard";
import type { Team } from "@/games/coat10s/game/engine";
import { TEAM_LETTER } from "./labels";
import styles from "./Plate.module.css";

interface Props {
  name: string | null;
  connected: boolean;
  isYou?: boolean;
  team: Team;
  handCount: number;
  /** Whose move it is. */
  isTurn: boolean;
  /** This seat just won the hand on the table. */
  isWinner: boolean;
  /** Small label on the avatar: "Opens", "Leads" or "Led". */
  tag: string | null;
  /** A player's own plate sits in a row; opponents' stack on phones. */
  me?: boolean;
}

/** A player's nameplate: who they are, which team and place, how many cards they hold, and whose move it is. */
export function Plate({ name, connected, isYou, team, handCount, isTurn, isWinner, tag, me }: Props) {
  const empty = name === null;
  return (
    <div
      className={styles.plate}
      data-me={me}
      data-turn={isTurn}
      data-winner={isWinner}
      data-away={!empty && !connected}
      data-empty={empty}
      data-team={team}
    >
      <div className={styles.avatar} aria-hidden="true">
        {empty ? "?" : name.slice(0, 1).toUpperCase()}
        {tag && <span className={styles.tag}>{tag}</span>}
      </div>

      <div className={styles.info}>
        <span className={styles.name}>
          {empty ? "Empty seat" : name}
          {isYou && <em> (you)</em>}
        </span>
        <span className={styles.stat}>
          {isTurn ? "Playing…" : `Team ${TEAM_LETTER[team]}`}
        </span>
      </div>

      {handCount > 0 && (
        <span className={styles.cards} aria-label={`${handCount} cards`}>
          <PlayingCard faceDown className={styles.mini} />
          <b>{handCount}</b>
        </span>
      )}

      {isWinner && (
        <span className={styles.pop} aria-hidden="true">
          +1
        </span>
      )}
    </div>
  );
}
