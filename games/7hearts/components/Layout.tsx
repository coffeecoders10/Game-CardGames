import type { CSSProperties } from "react";
import { type Card, type Rank, RANK_LABELS, SUIT_NAMES, type Suit, sameCard } from "@/lib/cards/cards";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { SuitIcon } from "@/components/cards/Suit";
import { type Board, laneSuit } from "@/games/7hearts/game/engine";
import styles from "./Layout.module.css";

const rankOf = (value: number) => (value === 1 ? 14 : value) as Rank;

/** A dashed outline showing which card a suit is waiting for. */
function Next({ suit, value, hot }: { suit: Suit; value: number; hot: boolean }) {
  return (
    <span className={styles.next} data-hot={hot} aria-hidden="true">
      <b>{RANK_LABELS[rankOf(value)]}</b>
      <SuitIcon suit={suit} />
    </span>
  );
}

function describe(suit: Suit, run: Board[number]) {
  if (!run) return `${SUIT_NAMES[suit]}: not started`;
  const label = (v: number) => RANK_LABELS[rankOf(v)];
  return `${SUIT_NAMES[suit]}: ${label(run.low)} to ${label(run.high)} on the table`;
}

interface Props {
  board: Board;
  /** The card just played, to glow. */
  fresh: Card | null;
  /** Cards my hand could play now, so the matching ends of each run can light up. */
  playable: readonly Card[];
}

/** One vertical column per lane (four, or eight with two decks), each growing out from its 7 upward (lower) and downward (higher). */
export function Layout({ board, fresh, playable }: Props) {
  return (
    <div className={styles.layout} data-lanes={board.length}>
      {board.map((run, lane) => {
        const suit = laneSuit(lane);
        const cards: Card[] = [];
        if (run) for (let v = run.low; v <= run.high; v++) cards.push({ suit, rank: rankOf(v) });
        // A finished suit (A to K) folds into a tight pile with the Ace on top.
        const complete = !!run && run.low === 1 && run.high === 13;
        if (complete) cards.reverse();
        const wants = (value: number) => playable.some((c) => sameCard(c, { suit, rank: rankOf(value) }));
        return (
          <div key={lane} className={styles.col} role="group" aria-label={describe(suit, run)} data-red={suit === "H" || suit === "D"}>
            <span className={styles.tag} aria-hidden="true">
              <SuitIcon suit={suit} />
            </span>
            <div className={styles.run} data-complete={complete}>
              {!run && <Next suit={suit} value={7} hot={wants(7)} />}
              {run && run.low > 1 && <Next suit={suit} value={run.low - 1} hot={wants(run.low - 1)} />}
              {cards.map((card, i) => (
                <PlayingCard
                  key={card.rank}
                  card={card}
                  fresh={fresh !== null && sameCard(fresh, card)}
                  className={styles.card}
                  style={{ "--i": i } as CSSProperties}
                />
              ))}
              {run && run.high < 13 && <Next suit={suit} value={run.high + 1} hot={wants(run.high + 1)} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
