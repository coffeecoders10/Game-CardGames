"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Suit } from "@/lib/cards/cards";
import { SuitIcon } from "@/components/cards/Suit";
import { RulesDialog } from "@/components/ui/RulesDialog";
import styles from "./TableShell.module.css";

interface Props {
  /** Accessible game name, read in place of the stylised logo. */
  name: string;
  logo: string;
  /** Game state in the middle of the header: round, trump. Omit before the game starts. */
  meta?: ReactNode;
  rulesTitle: string;
  rules: ReactNode;
  /** Connection or pause banner. */
  alert?: string | null;
  /** A rejected-move message, shown briefly. */
  notice?: { id: number; message: string } | null;
  onLeave(): void;
  /** Scoreboard content. When given, a Scores button beside Rules opens it in a modal. */
  scores?: ReactNode;
  /** The board and the player's cards: the shell is a three-row grid (header, board, hand). */
  children: ReactNode;
}

/** The trump suit as a paper chip, for the header's `meta`. */
export function TrumpChip({ suit }: { suit: Suit }) {
  return (
    <span className={styles.trump} data-red={suit === "H" || suit === "D"} key={suit}>
      <SuitIcon suit={suit} /> Trump
    </span>
  );
}

/** Felt, leather rail and header (wordmark, state, Rules, Leave) shared by every game's table. */
export function TableShell({ name, logo, meta, rulesTitle, rules, alert, notice, onLeave, scores, children }: Props) {
  const rulesRef = useRef<HTMLDialogElement>(null);
  const scoresRef = useRef<HTMLDialogElement>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // "Leave" asks again for three seconds instead of opening a modal.
  useEffect(() => {
    if (!confirmLeave) return;
    const timer = setTimeout(() => setConfirmLeave(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmLeave]);

  return (
    <div className={styles.room}>
      <header className={styles.top}>
        <h1 className={styles.logo} aria-label={name}>
          {logo}
        </h1>
        {meta && <div className={styles.meta}>{meta}</div>}
        <div className={styles.tools}>
          {alert && (
            <span className={styles.status} role="alert" title={alert} aria-label={alert}>
              <span className={styles.statusDot} aria-hidden="true" />
            </span>
          )}
          {scores && (
            <button type="button" className={styles.tool} onClick={() => scoresRef.current?.showModal()}>
              Scores
            </button>
          )}
          <button type="button" className={styles.tool} onClick={() => rulesRef.current?.showModal()}>
            Rules
          </button>
          <button
            type="button"
            className={styles.tool}
            data-danger={confirmLeave}
            onClick={() => (confirmLeave ? onLeave() : setConfirmLeave(true))}
          >
            {confirmLeave ? "Leave table?" : "Leave"}
          </button>
        </div>
      </header>

      {children}

      {notice && (
        <div className={styles.notice} role="status" key={notice.id}>
          {notice.message}
        </div>
      )}

      {scores && (
        <RulesDialog dialogRef={scoresRef} title="Scores" id="scores-title">
          {scores}
        </RulesDialog>
      )}
      <RulesDialog dialogRef={rulesRef} title={rulesTitle}>
        {rules}
      </RulesDialog>
    </div>
  );
}
