import type { CSSProperties } from "react";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { SuitIcon } from "@/components/cards/Suit";
import { isRed } from "@/lib/cards/cards";
import type { GameView, TableView } from "@/games/coat10s/game/view";
import { direction } from "./ring";
import styles from "./TrickArea.module.css";

const BURST = Array.from({ length: 10 }, (_, i) => i);

/** The cards on the table for the current hand, each on the side of the player who played it. */
export function TrickArea({ view, game }: { view: TableView; game: GameView }) {
  const n = game.players;
  const mePos = game.order.indexOf(view.you);
  /** Places clockwise from you, by the fixed alternating order. */
  const relOf = (seat: number) => (game.order.indexOf(seat) - mePos + n) % n;
  const done = game.step === "trickDone" && game.trickWinner !== null;
  const winner = done ? direction(relOf(game.trickWinner as number), n) : null;
  const winnerName = done ? (view.seats[game.trickWinner as number]?.name ?? "Player") : "";
  const winnerTeam = done ? (game.teams[0].includes(game.trickWinner as number) ? "A" : "B") : "";

  return (
    <div
      className={styles.trick}
      data-done={done}
      style={winner ? ({ "--wx": winner.x, "--wy": winner.y } as CSSProperties) : undefined}
    >
      {game.trump && (
        <SuitIcon
          key={`${game.round}${game.trump}`}
          suit={game.trump}
          className={`${styles.mark} ${isRed(game.trump) ? styles.markRed : ""}`}
        />
      )}

      {game.trick.map((play, order) => {
        const rel = relOf(play.seat);
        const dir = direction(rel, n);
        const wins = done && game.trickWinner === play.seat;
        return (
          <div
            key={`${game.round}-${game.tricksPlayed}-${play.seat}`}
            className={styles.slot}
            data-win={wins}
            style={
              {
                "--x": dir.x,
                "--y": dir.y,
                "--tilt": `${((rel * 37 + order * 11) % 17) - 8}deg`,
                zIndex: order + 1,
              } as CSSProperties
            }
          >
            <PlayingCard card={play.card} trump={game.trump !== null && play.card.suit === game.trump} className={styles.played} />
            {wins && (
              <div className={styles.burst} aria-hidden="true">
                {BURST.map((i) => (
                  <i key={i} style={{ "--a": `${i * 36}deg`, "--s": `${(i % 3) * 0.12}s` } as CSSProperties} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {done && (
        <p className={styles.award} role="status">
          {game.trickWinner === view.you ? "You take the hand" : `${winnerName} takes the hand`} · Team {winnerTeam}
        </p>
      )}
    </div>
  );
}
