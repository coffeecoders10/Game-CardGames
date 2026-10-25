"use client";

import { useMemo, type CSSProperties } from "react";
import { type Card, cardKey } from "@/lib/cards/cards";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { valueOf } from "@/games/7hearts/game/engine";
import styles from "./Hand.module.css";

interface Props {
  cards: Card[];
  /** Keys of cards that can be played right now; others dim. Null on someone else's turn. */
  choosable: ReadonlySet<string> | null;
  selected: string | null;
  onChoose(card: Card): void;
}

const SUIT_ORDER = ["S", "H", "C", "D"];

/** Grouped by suit, low to high, so runs read left to right the way they sit on the table. */
const sortForHand = (cards: readonly Card[]) =>
  cards.slice().sort((a, b) => SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit) || valueOf(a) - valueOf(b));

/** The player's hand, grouped by suit and fanned like a hand held at the table. */
export function Hand({ cards, choosable, selected, onChoose }: Props) {
  const sorted = useMemo(() => sortForHand(cards), [cards]);
  // The fewer the cards, the wider each steps apart; 18 cards stay within about 60 degrees.
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
