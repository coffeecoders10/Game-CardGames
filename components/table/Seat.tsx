import { PlayingCard } from "@/components/cards/PlayingCard";
import styles from "./Seat.module.css";

export type SeatPosition = "left" | "right" | "top" | "me";

interface Props {
  position: SeatPosition;
  name: string | null;
  connected: boolean;
  isYou?: boolean;
  /** Hands this player must win, once a round is under way. */
  target?: number;
  wins?: number;
  handCount?: number;
  isTurn?: boolean;
  /** This seat just won the hand on the table. */
  isWinner?: boolean;
  /** Back design for the opponent's fanned cards. */
  back?: "lattice" | "rosette";
  /** Skip the fan of cards, for tables with several opponents. */
  compact?: boolean;
  /** Line under the name when there is no target tally. */
  sub?: string;
  /** Finished for the round (no cards left) and watching: the plate dims. */
  isOut?: boolean;
}

function Tally({ target, wins }: { target: number; wins: number }) {
  const slots = Math.max(target, wins);
  return (
    <div className={styles.tally} role="img" aria-label={`${wins} of ${target} hands won`}>
      {Array.from({ length: slots }, (_, i) => (
        <span
          key={i}
          className={styles.dot}
          data-filled={i < wins}
          data-extra={i >= target}
          data-met={wins >= target}
        />
      ))}
      <span className={styles.count}>
        <b key={wins}>{wins}</b>/{target}
      </span>
    </div>
  );
}

/** A player's nameplate: avatar with target token, hands won, and (for opponents) a fan of their cards. */
export function Seat({
  position,
  name,
  connected,
  isYou,
  target,
  wins = 0,
  handCount = 0,
  isTurn,
  isWinner,
  back,
  compact,
  sub,
  isOut,
}: Props) {
  const empty = name === null;
  return (
    <div
      className={styles.seat}
      data-position={position}
      data-turn={isTurn ? "true" : "false"}
      data-away={!empty && !connected}
      data-empty={empty}
      data-winner={isWinner ? "true" : "false"}
      data-out={isOut ? "true" : "false"}
    >
      <div className={styles.plate}>
        <div className={styles.avatar} aria-hidden="true">
          {empty ? "?" : name.slice(0, 1).toUpperCase()}
          {target !== undefined && <span className={styles.token}>{target}</span>}
        </div>
        <div className={styles.info}>
          <span className={styles.name}>
            {empty ? "Waiting for player" : name}
            {isYou && <em> (you)</em>}
          </span>
          {target !== undefined ? (
            <Tally target={target} wins={wins} />
          ) : (
            <span className={styles.sub}>
              {empty ? "Share the code to invite" : !connected ? "Reconnecting…" : (sub ?? "Ready")}
            </span>
          )}
        </div>
        {isWinner && wins > 0 && (
          <span key={wins} className={styles.pop} aria-hidden="true">
            +1
          </span>
        )}
      </div>

      {position !== "me" && !compact && handCount > 0 && (
        <div className={styles.fan} aria-label={`${handCount} cards`} data-origin="fan">
          {Array.from({ length: handCount }, (_, i) => (
            <PlayingCard
              key={i}
              faceDown
              back={back}
              className={styles.mini}
              style={{ "--d": i - (handCount - 1) / 2, "--k": i } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}
