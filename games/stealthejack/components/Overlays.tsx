import { type CSSProperties, useEffect, useState } from "react";
import { PlayingCard } from "@/components/cards/PlayingCard";
import type { GameView, TableView } from "@/games/stealthejack/game/view";
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
  onLeave(): void;
}

/** End-of-round sheet: who is stuck with the Jack, what they were holding, and everyone's losses. */
export function RoundSummary({ view, game, disabled, onReady, onLeave }: Props) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  useEffect(() => {
    if (!confirmLeave) return;
    const timer = setTimeout(() => setConfirmLeave(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmLeave]);

  const summary = game.summary;
  if (!summary) return null;

  const { loser } = summary;
  const rows = game.losses.map((_, seat) => seat).sort((a, b) => game.losses[a] - game.losses[b] || a - b);
  const waiting = game.ready.filter(Boolean).length;
  const iAmReady = game.ready[view.you];
  const headline =
    loser === view.you ? "You're stuck with the Jack" : `${nameOf(view, loser)} is stuck with the Jack`;

  return (
    <div className={`${panel.panel} ${styles.summary}`} role="dialog" aria-label={`Round ${game.round} results`}>
      <h2 className={panel.title}>Round {game.round}</h2>
      <p className={styles.headline} data-you={loser === view.you}>
        {headline}
      </p>

      <div className={styles.held} aria-label={`${youOr(view, loser)} held ${plural(summary.hand.length, "card", "cards")}`}>
        {summary.hand.map((card, i) => (
          <PlayingCard
            key={`${card.rank}${card.suit}`}
            card={card}
            selected={card.rank === 11}
            className={styles.heldCard}
            style={{ "--i": i } as CSSProperties}
          />
        ))}
      </div>

      <ul className={styles.rows}>
        {rows.map((seat, i) => (
          <li key={seat} className={styles.row} data-loser={seat === loser} style={{ "--i": i } as CSSProperties}>
            <span className={styles.who}>
              <span className={styles.name}>{youOr(view, seat)}</span>
              {seat === loser && <small>Lost this round</small>}
            </span>
            {seat === loser && <span className={styles.gain}>+1</span>}
            <span className={styles.total}>
              {game.losses[seat]} <small>{game.losses[seat] === 1 ? "loss" : "losses"}</small>
            </span>
          </li>
        ))}
      </ul>

      <p className={panel.fine}>Only losses count. Fewest wins the evening.</p>

      <button type="button" className={`${panel.primary} ${styles.next}`} disabled={disabled || iAmReady} onClick={onReady}>
        {iAmReady ? `Waiting for others (${waiting} of ${game.players})` : "Deal another round"}
      </button>
      <button type="button" className={styles.quit} data-danger={confirmLeave} onClick={() => (confirmLeave ? onLeave() : setConfirmLeave(true))}>
        {confirmLeave ? "Leave table?" : "Leave table"}
      </button>
    </div>
  );
}
