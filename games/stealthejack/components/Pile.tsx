import type { CSSProperties } from "react";
import type { Card } from "@/lib/cards/cards";
import { PlayingCard } from "@/components/cards/PlayingCard";
import styles from "./Pile.module.css";

/** Pairs shown on the pile; older ones are underneath and only counted. */
const SHOWN = 7;

interface Props {
  /** Every discarded card, two to a pair, oldest first. */
  cards: readonly Card[];
  /** Index of the pair thrown last and who threw it, so it can fly in from their side. */
  last: { seat: number; fromYou: boolean } | null;
}

/** The central discard pile: pairs thrown face up, each landing a little off-square on the last. */
export function Pile({ cards, last }: Props) {
  const pairs = Math.floor(cards.length / 2);
  const first = Math.max(0, pairs - SHOWN);

  return (
    <div className={styles.pile} role="group" aria-label={`Discard pile, ${cards.length} cards`}>
      {pairs === 0 && (
        <span className={styles.empty} aria-hidden="true">
          Discards
        </span>
      )}
      {Array.from({ length: pairs - first }, (_, n) => {
        const i = first + n;
        const fresh = last !== null && i === pairs - 1;
        return (
          <span
            key={i}
            className={styles.pair}
            data-fresh={fresh}
            style={
              {
                "--turn": `${((i * 53) % 29) - 14}deg`,
                "--dx": `${((i * 37) % 23) - 11}px`,
                "--dy": `${((i * 19) % 13) - 6}px`,
                "--from": last?.fromYou ? 1 : -1,
              } as CSSProperties
            }
          >
            <PlayingCard card={cards[i * 2]} className={styles.card} />
            <PlayingCard card={cards[i * 2 + 1]} className={styles.card} />
          </span>
        );
      })}
      {cards.length > 0 && <span className={styles.count}>{cards.length} out</span>}
    </div>
  );
}
