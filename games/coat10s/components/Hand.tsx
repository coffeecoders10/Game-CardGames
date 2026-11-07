"use client";

import { useMemo, type CSSProperties } from "react";
import { type Card, type Suit, cardKey, sortHand } from "@/lib/cards/cards";
import { PlayingCard } from "@/components/cards/PlayingCard";
import styles from "./Hand.module.css";

interface Props {
  cards: Card[];
  /** Null until a trump suit has been named this round. */
  trump: Suit | null;
  /** Keys of cards that can be played right now; others dim. Null when it isn't your turn to play. */
  choosable: ReadonlySet<string> | null;
  selected: string | null;
  onChoose(card: Card): void;
}

/** The player's hand, trump first (once named) then by suit and rank, fanned like a hand held at the table. */
export function Hand({ cards, trump, choosable, selected, onChoose }: Props) {
  const sorted = useMemo(() => sortHand(cards, trump), [cards, trump]);
  // The fewer the cards, the wider each steps apart; 13 cards stay within about 55 degrees.
  const angle = Math.min(6, 60 / Math.max(sorted.length, 1));

  return (
    <div
      className={styles.hand}
      role="group"
      aria-label="Your hand"
      data-turn={choosable !== null}
      style={{ "--n": sorted.length, "--angle": `${angle}deg` } as CSSProperties}
    >
      {sorted.map((card, k) => {
        const key = cardKey(card);
        const pickable = choosable?.has(key) ?? false;
        return (
          <PlayingCard
            key={key}
            card={card}
            trump={trump !== null && card.suit === trump}
            className={`${styles.card} ${selected === key ? styles.lift : ""} ${pickable ? styles.can : ""}`}
            style={{ "--k": k, "--d": k - (sorted.length - 1) / 2 } as CSSProperties}
            disabled={choosable !== null && !pickable}
            selected={selected === key}
            dataKey={key}
            onClick={() => pickable && onChoose(card)}
          />
        );
      })}
    </div>
  );
}
