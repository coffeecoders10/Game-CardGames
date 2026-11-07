import { SUITS, type Card } from "@/lib/cards/cards";
import { SuitIcon } from "@/components/cards/Suit";
import { TEAM_NAMES, type Team } from "@/games/coat10s/game/engine";
import type { GameView, TableView } from "@/games/coat10s/game/view";
import { TEAM_LETTER } from "./labels";
import styles from "./TeamStrip.module.css";

/** The four 10s as small paper chips; a team's chip lights up when it has captured that 10. */
export function TenChips({ held, size }: { held: readonly Card[]; size?: "lg" }) {
  return (
    <span className={`${styles.tens} ${size === "lg" ? styles.lg : ""}`} role="img" aria-label={`${held.length} of 4 tens captured`}>
      {SUITS.map((suit) => {
        const has = held.some((c) => c.suit === suit);
        return (
          <span key={suit} className={styles.ten} data-on={has} data-red={suit === "H" || suit === "D"}>
            <b>10</b>
            <SuitIcon suit={suit} />
          </span>
        );
      })}
    </span>
  );
}

interface Props {
  view: TableView;
  game: GameView;
  /** Team the viewer plays for. */
  mine: Team;
  /** Team that will open the next hand, shown as a pip while a round is live. */
  leading: Team | null;
}

/** Both teams side by side: members, coats (prominent), captured 10s and hands won this round. */
export function TeamStrip({ view, game, mine, leading }: Props) {
  // The team ahead goes on top: more coats, then more 10s, then more hands; level keeps Team A first.
  const lead = (t: Team) => [game.coats[t], game.tens[t].length, game.handsWon[t]];
  const [a, b] = [lead(0), lead(1)];
  const diff = a.map((n, i) => n - b[i]).find((d) => d !== 0) ?? 0;
  const teams: Team[] = diff < 0 ? [1, 0] : [0, 1];
  return (
    <section className={styles.strip} aria-label="Teams">
      {teams.map((team) => {
        const names = game.teams[team].map((s) => (s === view.you ? "You" : (view.seats[s]?.name ?? "Player")));
        const coats = game.coats[team];
        return (
          <div key={team} className={styles.team} data-team={team} data-mine={team === mine} data-lead={leading === team}>
            <header className={styles.head}>
              <span className={styles.badge} aria-hidden="true">
                {TEAM_LETTER[team]}
              </span>
              <span className={styles.title}>
                <b>{TEAM_NAMES[team]}</b>
                <small title={names.join(", ")}>{names.join(" · ")}</small>
              </span>
              <span className={styles.coats} aria-label={`${coats} ${coats === 1 ? "coat" : "coats"}`} data-zero={coats === 0}>
                <b key={coats}>{coats}</b>
                <small>{coats === 1 ? "coat" : "coats"}</small>
              </span>
            </header>
            <div className={styles.foot}>
              <TenChips held={game.tens[team]} />
              <span className={styles.hands} aria-label={`${game.handsWon[team]} hands won`}>
                <b key={game.handsWon[team]}>{game.handsWon[team]}</b> {game.handsWon[team] === 1 ? "hand" : "hands"}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
