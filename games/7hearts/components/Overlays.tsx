import type { CSSProperties } from "react";
import { ROUNDS, leaders } from "@/games/7hearts/game/engine";
import type { GameView, TableView } from "@/games/7hearts/game/view";
import panel from "@/components/table/TablePanel.module.css";
import styles from "./Overlays.module.css";

const nameOf = (view: TableView, seat: number) => view.seats[seat]?.name ?? "Player";
const youOr = (view: TableView, seat: number) => (seat === view.you ? "You" : nameOf(view, seat));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

interface Props {
  view: TableView;
  game: GameView;
  disabled: boolean;
  onReady(): void;
}

/** Live standings for the scoreboard dialog: running totals, fewest points first. */
export function ScoreList({ view, game }: { view: TableView; game: GameView }) {
  const rows = game.scores.map((_, seat) => seat).sort((a, b) => game.scores[a] - game.scores[b] || a - b);
  const top = game.round > 1 || game.step === "summary" ? leaders(game.scores) : [];
  return (
    <ul className={styles.rows} aria-label="Scoreboard">
      {rows.map((seat, i) => (
        <li key={seat} className={`${styles.row} ${styles.live}`} data-lead={top.includes(seat)}>
          <span className={styles.rank}>{i + 1}</span>
          <span className={styles.who}>
            <span className={styles.name}>{youOr(view, seat)}</span>
            <small>{plural(game.handCounts[seat], "card left", "cards left")}</small>
          </span>
          <span className={styles.total}>
            {game.scores[seat]} <small>pts</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** End-of-round sheet: who went out, what everyone took, the running totals. After round seven, the result. */
export function RoundSummary({ view, game, disabled, onReady }: Props) {
  const summary = game.summary;
  if (!summary) return null;

  const final = game.round >= ROUNDS;
  const winners = leaders(game.scores);
  const rows = game.scores.map((_, seat) => seat).sort((a, b) => game.scores[a] - game.scores[b] || a - b);
  const waiting = game.ready.filter(Boolean).length;
  const iAmReady = game.ready[view.you];

  const headline = !final
    ? `${youOr(view, summary.winner)} went out`
    : winners.length > 1
      ? `${winners.map((s) => youOr(view, s)).join(" and ")} tie`
      : `${youOr(view, winners[0])} ${winners[0] === view.you ? "win" : "wins"}`;

  return (
    <div className={`${panel.panel} ${styles.summary}`} role="dialog" aria-label={final ? "Final scores" : `Round ${game.round} results`}>
      <h2 className={panel.title}>{final ? "Final scores" : `Round ${game.round} of ${ROUNDS}`}</h2>
      <p className={styles.headline}>{headline}</p>

      <ul className={styles.rows}>
        {rows.map((seat, i) => {
          const left = summary.leftover[seat].length;
          return (
            <li
              key={seat}
              className={styles.row}
              data-out={seat === summary.winner}
              data-lead={final && winners.includes(seat)}
              style={{ "--i": i } as CSSProperties}
            >
              <span className={styles.rank}>{i + 1}</span>
              <span className={styles.who}>
                <span className={styles.name}>{youOr(view, seat)}</span>
                <small>{seat === summary.winner ? "Out first" : plural(left, "card left", "cards left")}</small>
              </span>
              <span className={styles.gain}>{summary.penalties[seat] === 0 ? "0" : `+${summary.penalties[seat]}`}</span>
              <span className={styles.total}>
                {game.scores[seat]} <small>pts</small>
              </span>
            </li>
          );
        })}
      </ul>

      <p className={panel.fine}>Fewest points wins. Lowest first.</p>

      <button type="button" className={`${panel.primary} ${styles.next}`} disabled={disabled || iAmReady} onClick={onReady}>
        {iAmReady ? `Waiting for others (${waiting} of ${game.players})` : final ? "Play again" : `Deal round ${game.round + 1}`}
      </button>
    </div>
  );
}
