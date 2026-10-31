"use client";

import { useEffect, useMemo, useState } from "react";
import { type Card, RANK_LABELS, cardKey, cardName } from "@/lib/cards/cards";
import { useMediaQuery } from "@/lib/hooks/useClientValue";
import { Lobby } from "@/components/table/Lobby";
import type { TableProps } from "@/components/table/RoomClient";
import { Seat } from "@/components/table/Seat";
import { TableShell } from "@/components/table/TableShell";
import { MIN_PLAYERS } from "@/games/stealthejack/game/engine";
import type { GameView, TableView } from "@/games/stealthejack/game/view";
import type { GameAction } from "@/games/stealthejack/net/protocol";
import { Hand } from "./Hand";
import { RoundSummary } from "./Overlays";
import { PickRow } from "./PickRow";
import { Pile } from "./Pile";
import { RulesStealTheJack } from "./RulesStealTheJack";
import styles from "./Table.module.css";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const RANK_PLURALS: Record<number, string> = { 11: "Jacks", 12: "Queens", 13: "Kings", 14: "Aces" };
const rankPlural = (rank: number) => RANK_PLURALS[rank] ?? `${RANK_LABELS[rank as keyof typeof RANK_LABELS]}s`;

export function Table({ view, status, notice, busy, isHost, act, onLeave }: TableProps<TableView, GameAction>) {
  const game = view.game;
  const you = view.you;
  const touch = useMediaQuery("(pointer: coarse)");
  const [selected, setSelected] = useState<string[]>([]);
  const [chosenPick, setChosenPick] = useState<number | null>(null);

  const live = !!game && !view.paused;
  const playing = live && game.step !== "summary";
  const myTurn = playing && game.turn === you;
  const picking = myTurn && game.step === "pick";
  const canPair = myTurn && (game.step === "discard" || game.step === "pair") && game.hand.length > 0;
  const beingPicked = playing && game.step === "pick" && game.source === you;
  const out = playing && game.hand.length === 0;
  const nameOf = (seat: number) => (seat === you ? "You" : (view.seats[seat]?.name ?? "Player"));

  // A choice only makes sense while that card is still in your hand and it's still your turn to use it.
  const heldKeys = useMemo(() => new Set(game?.hand.map((s) => cardKey(s.card))), [game?.hand]);
  const chosen = canPair ? selected.filter((k) => heldKeys.has(k)) : [];
  const pickId = picking && game?.lineup?.includes(chosenPick ?? -1) ? chosenPick : null;

  // A nudge on phones when it becomes your move.
  useEffect(() => {
    // Browsers only allow vibration after the page has had a tap or click.
    if (myTurn && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(30);
  }, [myTurn]);

  const toggle = (card: Card) => {
    const key = cardKey(card);
    setSelected(chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen.slice(-1), key]);
  };

  const discard = () => {
    if (busy || chosen.length !== 2 || !game) return;
    const cards = chosen.map((k) => game.hand.find((s) => cardKey(s.card) === k)?.card);
    if (!cards[0] || !cards[1]) return;
    setSelected([]);
    act({ type: "pair", cards: [cards[0], cards[1]] });
  };

  const take = (id: number) => {
    if (busy) return;
    // Phones take two taps, so a card is never taken by a stray touch.
    if (touch && pickId !== id) {
      setChosenPick(id);
      return;
    }
    setChosenPick(null);
    act({ type: "pick", id });
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
    if (g.step === "summary") return "Round over";
    if (g.hand.length === 0) return "You're out — watching the rest play";
    if (g.turn === you) {
      if (g.step === "discard") return "Your pairs — choose two cards to discard, then tap Done";
      if (g.step === "pick") return `Your turn — take a card from ${nameOf(g.source ?? you)}`;
      return "Discard any pairs you can, then end your turn";
    }
    if (g.step === "discard") return `${nameOf(g.turn)} is discarding pairs…`;
    if (g.step === "pick") {
      return g.source === you
        ? `${nameOf(g.turn)} is picking from you`
        : `${nameOf(g.turn)} is picking from ${nameOf(g.source ?? g.turn)}`;
    }
    return `${nameOf(g.turn)} is matching pairs…`;
  }

  function lastLine(g: GameView): string | null {
    const move = g.lastMove;
    if (!move) return null;
    if (move.kind === "pair") return `${nameOf(move.seat)} discarded a pair of ${rankPlural(move.cards[0].rank)}`;
    const fresh = move.seat === you ? g.hand.find((s) => s.id === g.freshId) : null;
    return fresh
      ? `You took the ${cardName(fresh.card)} from ${nameOf(move.from)}`
      : `${nameOf(move.seat)} took a card from ${nameOf(move.from)}`;
  }

  const plate = (seat: number, position: "top" | "me") => {
    const g = game;
    const count = g?.counts[seat] ?? 0;
    const losses = g?.losses[seat] ?? 0;
    const isOut = playing && count === 0;
    return (
      <Seat
        key={seat}
        position={position}
        compact
        name={view.seats[seat]?.name ?? null}
        connected={view.seats[seat]?.connected ?? false}
        isYou={seat === you}
        handCount={count}
        sub={g ? `${isOut ? "Out" : plural(count, "card", "cards")} · ${plural(losses, "loss", "losses")}` : undefined}
        isTurn={playing && g?.turn === seat}
        isOut={isOut}
      />
    );
  };

  // Opponents in the order they play after me: clockwise.
  const opponents = game ? Array.from({ length: game.players - 1 }, (_, k) => (you + 1 + k) % game.players) : [];
  const line = view.paused || !game ? "" : statusLine(game);
  const last = game && playing ? lastLine(game) : null;
  const lastPair = game?.lastMove?.kind === "pair" ? { seat: game.lastMove.seat, fromYou: game.lastMove.seat === you } : null;

  return (
    <TableShell
      name="Steal the Jack"
      logo="J♣"
      meta={game && <span>Round {game.round}</span>}
      rulesTitle="How Steal the Jack plays"
      rules={<RulesStealTheJack />}
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
              slug="stealthejack"
              title="Steal the Jack"
              isHost={isHost}
              minPlayers={MIN_PLAYERS}
              disabled={busy || view.paused}
              onStart={() => act({ type: "start" })}
            />
          )}

          {game && (
            <>
              {picking && game.lineup && game.source !== null && (
                <div className={styles.across}>
                  <p className={styles.acrossTitle}>
                    {nameOf(game.source)}&apos;s cards, as they see them from across the table
                  </p>
                  <PickRow lineup={game.lineup} chosen={pickId} disabled={busy} onPick={take} />
                </div>
              )}

              <Pile cards={game.pile} last={lastPair} />

              <div className={styles.status}>
                {line && (
                  <p className={styles.line} aria-live="polite" data-active={myTurn}>
                    {line}
                  </p>
                )}
                {picking && <p className={styles.last}>{touch ? "Tap a card, then tap it again to take it" : "Click a card to take it"}</p>}
                {beingPicked && <p className={styles.tip}>Drag your cards into a new order, or shuffle them</p>}
                {!picking && !beingPicked && last && <p className={styles.last}>{last}</p>}
              </div>
            </>
          )}
        </div>

        {game && <div className={styles.me}>{plate(you, "me")}</div>}

        {game && game.step === "summary" && (
          <div className={styles.overlay} data-dim>
            <RoundSummary view={view} game={game} disabled={busy} onReady={() => act({ type: "ready" })} onLeave={onLeave} />
          </div>
        )}
      </main>

      <footer className={styles.mine}>
        {game && playing && (
          <div className={styles.actions}>
            {canPair && (
              <>
                <button type="button" className={styles.go} disabled={busy || chosen.length !== 2} onClick={discard}>
                  Discard pair
                </button>
                <button type="button" className={styles.pass} disabled={busy} onClick={() => act({ type: "done" })}>
                  {game.step === "discard" ? "Done" : "End turn"}
                </button>
              </>
            )}
            {game.hand.length > 1 && (
              <button type="button" className={styles.pass} data-hot={beingPicked} onClick={() => act({ type: "shuffle" })}>
                Shuffle
              </button>
            )}
          </div>
        )}
        {game && game.hand.length > 0 ? (
          <Hand
            slots={game.hand}
            selected={chosen}
            canSelect={canPair && !busy}
            freshId={game.freshId}
            onSelect={toggle}
            onArrange={(order) => act({ type: "arrange", order })}
          />
        ) : (
          <div className={styles.emptyHand}>{out ? "No cards left" : ""}</div>
        )}
      </footer>
    </TableShell>
  );
}
