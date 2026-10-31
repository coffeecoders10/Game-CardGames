"use client";

import { useMemo, useRef } from "react";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { useFlip } from "@/lib/hooks/useFlip";
import { perRow, rowStyle, rowVars } from "./row";
import styles from "./Row.module.css";

interface Props {
  /** Slot ids of the other player's hand, left to right as that player sees their own cards. */
  lineup: readonly number[];
  /** The card currently chosen (touch screens take a second tap to confirm). */
  chosen: number | null;
  disabled: boolean;
  onPick(id: number): void;
}

/**
 * The backs of the other player's cards, seen from across the table. You sit opposite them, so their
 * left is your right: the lineup is simply their order reversed (a full 180 degree turn, rows
 * included). Cards are named by id, so a card they have just moved is still the card you touched.
 */
export function PickRow({ lineup, chosen, disabled, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFlip(ref);
  const shown = useMemo(() => lineup.slice().reverse(), [lineup]);
  const per = perRow(shown.length);

  return (
    <div
      ref={ref}
      className={`${styles.row} ${styles.pick}`}
      style={rowStyle(shown.length)}
      role="group"
      aria-label={`${shown.length} face-down cards. Choose one to take.`}
    >
      {shown.map((id, k) => (
        <PlayingCard
          key={id}
          faceDown
          className={`${styles.card} ${chosen === id ? styles.lift : ""}`}
          style={rowVars(k, per)}
          selected={chosen === id}
          disabled={disabled}
          dataKey={String(id)}
          onClick={() => !disabled && onPick(id)}
        />
      ))}
    </div>
  );
}
