"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { SUIT_NAMES, type Suit, isRed } from "@/lib/cards/cards";
import { SuitIcon } from "@/components/cards/Suit";
import { TEAM_NAMES, type RoundRecord, type StartPlan, type Team, otherTeam } from "@/games/coat10s/game/engine";
import type { GameView, TableView } from "@/games/coat10s/game/view";
import panel from "@/components/table/TablePanel.module.css";
import { TEAM_LETTER } from "./labels";
import { TenChips } from "./TeamStrip";
import styles from "./Overlays.module.css";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const nameOf = (view: TableView, seat: number) => view.seats[seat]?.name ?? "Player";
const youOr = (view: TableView, seat: number) => (seat === view.you ? "You" : nameOf(view, seat));

/** The trump suit stamped over the table the moment it is named, then gone. */
export function TrumpReveal({ suit, by, round }: { suit: Suit; by: string; round: number }) {
  return (
    <div className={styles.reveal} key={`${round}${suit}`} role="status" data-red={isRed(suit)}>
      <SuitIcon suit={suit} className={styles.revealSuit} />
      <p className={styles.revealText}>
        {SUIT_NAMES[suit]} is trump
        <small>named by {by}</small>
      </p>
    </div>
  );
}

/** The trump state, always visible: undetermined until the first off-suit play, then the suit and who named it. */
export function TrumpBadge({ suit, by }: { suit: Suit | null; by: string | null }) {
  if (suit === null) {
    return (
      <div className={`${styles.badge} ${styles.unset}`} aria-label="Trump: not yet determined">
        <span className={styles.qmark} aria-hidden="true">
          ?
        </span>
        <span>
          <small>Trump</small>
          Not yet determined
        </span>
      </div>
    );
  }
  return (
    <div className={styles.badge} data-red={isRed(suit)} key={suit} aria-label={`Trump: ${SUIT_NAMES[suit]}`}>
      <SuitIcon suit={suit} />
      <span>
        <small>Trump{by ? ` · set by ${by}` : ""}</small>
        {SUIT_NAMES[suit]}
      </span>
    </div>
  );
}

function useConfirm() {
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (!asked) return;
    const timer = setTimeout(() => setAsked(false), 3000);
    return () => clearTimeout(timer);
  }, [asked]);
  return [asked, setAsked] as const;
}

/** One sentence on who opens next and why; says so plainly when active coats beat the better team. */
export function startReason(record: Pick<RoundRecord, "better" | "coats">, next: StartPlan): string {
  const team = TEAM_NAMES[next.team];
  switch (next.reason) {
    case "coats":
      return record.better !== null && record.better !== next.team
        ? `${team} retains the opening turn due to its active coats, even though ${TEAM_NAMES[otherTeam(next.team)]} did better.`
        : `${team} opens: it holds ${plural(record.coats[next.team], "active coat", "active coats")}.`;
    case "tens":
      return `${team} opens: it captured more 10s.`;
    case "hands":
      return `${team} opens: the 10s were split 2–2 and it won more hands.`;
    case "tie":
      return `${team} opens again: the round tied completely, so the last opening team keeps the turn.`;
  }
}

interface RoundProps {
  view: TableView;
  game: GameView;
  isHost: boolean;
  disabled: boolean;
  onReady(): void;
  onEnd(): void;
}

function coatLine(r: RoundRecord): string {
  return r.coatFor === null ? "No coat this round" : `${TEAM_NAMES[r.coatFor]} captured all four 10s: coat!`;
}

/** End-of-round sheet: 10s and hands per team, who did better, coats, and who opens next. */
export function RoundSummary({ view, game, isHost, disabled, onReady, onEnd }: RoundProps) {
  const [confirmEnd, setConfirmEnd] = useConfirm();
  const record = game.history[game.history.length - 1];
  if (!record || !game.next) return null;

  const waiting = game.ready.filter(Boolean).length;
  const iAmReady = game.ready[view.you];
  const opener = game.next.seat;

  return (
    <div className={`${panel.panel} ${styles.sheet}`} role="dialog" aria-label={`Round ${record.round} results`}>
      <h2 className={panel.title}>Round {record.round} complete</h2>

      <div className={styles.teams}>
        {([0, 1] as const).map((team) => (
          <div key={team} className={styles.tcol} data-team={team} data-better={record.better === team} style={{ "--i": team } as CSSProperties}>
            <p className={styles.tname}>
              <span className={styles.tbadge}>{TEAM_LETTER[team]}</span>
              {TEAM_NAMES[team]}
            </p>
            <TenChips held={record.tens[team]} size="lg" />
            <p className={styles.tstat}>
              <b>{record.tens[team].length}</b> {record.tens[team].length === 1 ? "ten" : "tens"}
            </p>
            <p className={styles.tstat}>
              <b>{record.handsWon[team]}</b> {record.handsWon[team] === 1 ? "hand" : "hands"} won
            </p>
          </div>
        ))}
      </div>

      <p className={styles.verdict} data-coat={record.coatFor !== null}>
        {record.better === null ? "Dead level — no better team" : `Better team: ${TEAM_NAMES[record.better]}`}
      </p>
      <p className={styles.coatLine} data-coat={record.coatFor !== null}>
        {coatLine(record)}
      </p>
      <p className={styles.coatNow}>
        Coats: Team A <b>{record.coats[0]}</b> · Team B <b>{record.coats[1]}</b>
      </p>

      <div className={styles.nextBox} data-team={game.next.team}>
        <small>Next round opens with</small>
        <b>
          {youOr(view, opener)}
        </b>
        <p>{startReason(record, game.next)}</p>
      </div>

      <button type="button" className={`${panel.primary} ${styles.go}`} disabled={disabled || iAmReady} onClick={onReady}>
        {iAmReady ? `Waiting for others (${waiting} of ${game.players})` : `Deal round ${record.round + 1}`}
      </button>
      {isHost ? (
        <button type="button" className={styles.quit} data-danger={confirmEnd} disabled={disabled} onClick={() => (confirmEnd ? onEnd() : setConfirmEnd(true))}>
          {confirmEnd ? "End the match for everyone?" : "End the match"}
        </button>
      ) : (
        <p className={styles.hint}>The host can end the match from here.</p>
      )}
    </div>
  );
}

function standing(coats: [number, number]): { team: Team | null; text: string } {
  if (coats[0] === coats[1]) return { team: null, text: "Level — no coats held" };
  const team: Team = coats[0] > coats[1] ? 0 : 1;
  return { team, text: `${TEAM_NAMES[team]} leads with ${plural(coats[team], "coat", "coats")}` };
}

/** The result of the whole session: the coat standing and every round's 10s. */
export function FinalResults({ game, disabled, view, onReady }: Omit<RoundProps, "isHost" | "onEnd">) {
  const waiting = game.ready.filter(Boolean).length;
  const iAmReady = game.ready[view.you];
  const { text } = standing(game.coats);

  return (
    <div className={`${panel.panel} ${styles.sheet} ${styles.final}`} role="dialog" aria-label="Final result">
      <h2 className={panel.title}>Match over</h2>
      <p className={styles.headline}>{text}</p>
      <p className={styles.sub}>{plural(game.history.length, "round", "rounds")} played</p>

      <div className={styles.scroll}>
        <table className={styles.rounds}>
          <caption>Round by round</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">A 10s</th>
              <th scope="col">B 10s</th>
              <th scope="col">Result</th>
              <th scope="col">Coats</th>
            </tr>
          </thead>
          <tbody>
            {game.history.map((r) => (
              <tr key={r.round}>
                <th scope="row">{r.round}</th>
                <td>{r.tens[0].length}</td>
                <td>{r.tens[1].length}</td>
                <td data-scored={r.coatFor !== null}>{r.coatFor === null ? "–" : `${TEAM_LETTER[r.coatFor]} coat`}</td>
                <td>
                  {r.coats[0]}–{r.coats[1]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className={`${panel.primary} ${styles.go}`} disabled={disabled || iAmReady} onClick={onReady}>
        {iAmReady ? `Waiting for others (${waiting} of ${game.players})` : "Play again"}
      </button>
    </div>
  );
}
