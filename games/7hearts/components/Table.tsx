"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Card, cardKey, cardName } from "@/lib/cards/cards";
import { useMediaQuery } from "@/lib/hooks/useClientValue";
import { Lobby } from "@/components/table/Lobby";
import type { TableProps } from "@/components/table/RoomClient";
import { Seat } from "@/components/table/Seat";
import { TableShell } from "@/components/table/TableShell";
import { MIN_PLAYERS, ROUNDS, isBoardEmpty, legalCards } from "@/games/7hearts/game/engine";
import type { GameView, TableView } from "@/games/7hearts/game/view";
import type { GameAction } from "@/games/7hearts/net/protocol";
import { Hand } from "./Hand";
import { Layout } from "./Layout";
import { RulesDialog } from "@/components/ui/RulesDialog";
import { RoundSummary, ScoreList } from "./Overlays";
import { Rules7Hearts } from "./Rules7Hearts";
import styles from "./Table.module.css";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Table({ view, status, notice, busy, isHost, act, onLeave }: TableProps<TableView, GameAction>) {
  const game = view.game;
  const you = view.you;
  const touch = useMediaQuery("(pointer: coarse)");
  const [selected, setSelected] = useState<string | null>(null);
  const scoresRef = useRef<HTMLDialogElement>(null);

  const live = !!game && !view.paused;
  const playing = live && game.step === "play";
  const myTurn = playing && game.turn === you;
  const nameOf = (seat: number) => (seat === you ? "You" : (view.seats[seat]?.name ?? "Player"));

  const legal = useMemo<Card[]>(() => (game ? legalCards(game.board, game.hand) : []), [game]);
  const mustPass = myTurn && legal.length === 0;
  const pickable = useMemo<ReadonlySet<string> | null>(
    () => (myTurn ? new Set(legal.map(cardKey)) : null),
    [myTurn, legal],
  );
  // A selection only makes sense while that card is still playable.
  const active = selected && pickable?.has(selected) ? selected : null;

  // A nudge on phones when it becomes your move.
  useEffect(() => {
    // Browsers only allow vibration after the page has had a tap or click.
    if (myTurn && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(30);
  }, [myTurn]);

  const play = (card: Card) => {
    if (busy) return;
    const key = cardKey(card);
    // Phones take two taps, so a card is never played by a stray touch.
    if (touch && active !== key) {
      setSelected(key);
      return;
    }
    setSelected(null);
    act({ type: "play", card });
  };

  const awayNames = view.seats
    .map((s, i) => (s.name !== null && !s.connected && i !== you ? s.name : null))
    .filter(Boolean);
  const alert =
    status === "offline"
      ? "Connection lost. Reconnecting…"
      : status === "host-away"
        ? "The host dropped off. Waiting for them to come back…"
        : view.paused
          ? `Paused — waiting for ${awayNames.join(" and ") || "a player"} to rejoin`
          : null;

  function statusLine(g: GameView): string {
    if (g.step === "summary") return g.round >= ROUNDS ? "Game over" : "Round complete";
    if (g.turn === you) {
      if (isBoardEmpty(g.board)) return "You hold the 7 of Hearts — open the round";
      return mustPass ? "Nothing fits — you have to pass" : "Your turn — play a glowing card";
    }
    return isBoardEmpty(g.board) ? `${nameOf(g.turn)} opens with the 7 of Hearts…` : `${nameOf(g.turn)}'s turn`;
  }

  function lastLine(g: GameView): string | null {
    const move = g.lastMove;
    if (!move) return null;
    return move.card ? `${nameOf(move.seat)} played the ${cardName(move.card)}` : `${nameOf(move.seat)} passed`;
  }

  const plate = (seat: number, position: "top" | "me") => {
    const g = game;
    return (
      <Seat
        key={seat}
        position={position}
        compact
        name={view.seats[seat]?.name ?? null}
        connected={view.seats[seat]?.connected ?? false}
        isYou={seat === you}
        handCount={g?.handCounts[seat]}
        sub={g ? `${plural(g.handCounts[seat], "card", "cards")}` : undefined}
        isTurn={playing && g?.turn === seat}
        isWinner={!!g && g.step === "summary" && g.summary?.winner === seat}
      />
    );
  };

  // Opponents in the order they play after me: clockwise.
  const opponents = game ? Array.from({ length: game.players - 1 }, (_, k) => (you + 1 + k) % game.players) : [];
  const line = view.paused || !game ? "" : statusLine(game);
  const last = game && game.step === "play" ? lastLine(game) : null;

  return (
    <TableShell
      name="7 of Hearts"
      logo="7♥"
      meta={game && <span>Round {game.round} of {ROUNDS}</span>}
      rulesTitle="How 7 of Hearts plays"
      rules={<Rules7Hearts />}
      alert={alert}
      notice={notice}
      onLeave={onLeave}
    >
      <main className={styles.board}>
        <div className={styles.opponents}>{opponents.map((seat) => plate(seat, "top"))}</div>

        <div className={styles.center}>
          {!game && (
            <Lobby
              view={view}
              slug="7hearts"
              title="7 of Hearts"
              isHost={isHost}
              minPlayers={MIN_PLAYERS}
              disabled={busy || view.paused}
              onStart={() => act({ type: "start" })}
            />
          )}

          {game && (
            <>
              <Layout board={game.board} fresh={game.lastMove?.card ?? null} playable={myTurn ? legal : []} />
              <div className={styles.status}>
                {line && (
                  <p className={styles.line} aria-live="polite" data-active={myTurn}>
                    {line}
                  </p>
                )}
                {last && <p className={styles.last}>{last}</p>}
                {mustPass && (
                  <button type="button" className={styles.pass} disabled={busy} onClick={() => act({ type: "pass" })}>
                    Pass
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {game && <div className={styles.me}>{plate(you, "me")}</div>}

        {game && game.step === "summary" && (
          <div className={styles.overlay} data-dim>
            <RoundSummary view={view} game={game} disabled={busy} onReady={() => act({ type: "ready" })} />
          </div>
        )}

        {game && (
          <>
            <button type="button" className={styles.scores} onClick={() => scoresRef.current?.showModal()}>
              Scores
            </button>
            <RulesDialog dialogRef={scoresRef} id="scores-title" title={`Scores · Round ${game.round} of ${ROUNDS}`}>
              <ScoreList view={view} game={game} />
            </RulesDialog>
          </>
        )}
      </main>

      <footer className={styles.mine}>
        {game && game.hand.length > 0 ? (
          <Hand cards={game.hand} choosable={pickable} selected={active} onChoose={play} />
        ) : (
          <div className={styles.emptyHand} />
        )}
      </footer>
    </TableShell>
  );
}
