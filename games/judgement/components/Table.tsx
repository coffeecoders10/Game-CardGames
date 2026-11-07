"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { type Card, SUIT_NAMES, cardKey, isRed } from "@/lib/cards/cards";
import { useMediaQuery } from "@/lib/hooks/useClientValue";
import { SuitIcon } from "@/components/cards/Suit";
import { Lobby } from "@/components/table/Lobby";
import type { TableProps } from "@/components/table/RoomClient";
import { TableShell, TrumpChip } from "@/components/table/TableShell";
import { MIN_PLAYERS, forbiddenJudgement, legalCards } from "@/games/judgement/game/engine";
import type { GameView, TableView } from "@/games/judgement/game/view";
import type { GameAction } from "@/games/judgement/net/protocol";
import { Hand } from "./Hand";
import { JudgePanel } from "./JudgePanel";
import { FinalResults, RoundSummary, ScoreList, TrumpBadge, TrumpReveal } from "./Overlays";
import { Plate } from "./Plate";
import { RulesJudgement } from "./RulesJudgement";
import { TrickArea } from "./TrickArea";
import { direction } from "./ring";
import styles from "./Table.module.css";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Table({ view, status, notice, busy, isHost, act, onLeave }: TableProps<TableView, GameAction>) {
  const game = view.game;
  const you = view.you;
  const touch = useMediaQuery("(pointer: coarse)");
  const [selected, setSelected] = useState<string | null>(null);

  const live = !!game && !view.paused;
  const myJudgement = live && game.step === "judge" && game.turn === you;
  const myTurn = live && game.step === "play" && game.turn === you;
  const nameOf = (seat: number) => (seat === you ? "You" : (view.seats[seat]?.name ?? "Player"));

  const legal = useMemo<Card[]>(() => (game ? legalCards(game.hand, game.trick) : []), [game]);
  const pickable = useMemo<ReadonlySet<string> | null>(
    () => (myTurn ? new Set(legal.map(cardKey)) : null),
    [myTurn, legal],
  );
  // A selection only makes sense while that card is still playable.
  const active = selected && pickable?.has(selected) ? selected : null;

  // A nudge on phones when it becomes your move.
  useEffect(() => {
    // Browsers only allow vibration after the page has had a tap or click.
    if ((myTurn || myJudgement) && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(30);
  }, [myTurn, myJudgement]);

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
    switch (g.step) {
      case "judge":
        return g.turn === you
          ? g.turn === g.starter
            ? "You start — call your hands"
            : "Your judgement — call your hands"
          : `${nameOf(g.turn)} is judging…`;
      case "play": {
        if (g.turn !== you) return `${nameOf(g.turn)}'s turn`;
        if (g.trick.length === 0) return "Your lead — play any card";
        const led = g.trick[0].card.suit;
        return g.hand.some((c) => c.suit === led) ? `Your turn — follow ${SUIT_NAMES[led]}` : `No ${SUIT_NAMES[led]} — play anything`;
      }
      case "trickDone":
        return ""; // the table itself announces the winner
      case "summary":
        return "Round complete";
      case "final":
        return "Game over";
    }
  }

  /** The small label on a plate: who started the judging, then who leads the hand on the table. */
  function tagFor(g: GameView, seat: number): string | null {
    if (g.step === "judge") return seat === g.starter ? "Starts" : null;
    if (g.step === "play" && g.trick.length === 0) return seat === g.turn ? "Leads" : null;
    if ((g.step === "play" || g.step === "trickDone") && g.trick.length > 0) return seat === g.trick[0].seat ? "Led" : null;
    return null;
  }

  const plate = (seat: number, me?: boolean) => (
    <Plate
      name={view.seats[seat]?.name ?? null}
      connected={view.seats[seat]?.connected ?? false}
      isYou={seat === you}
      me={me}
      judgement={game?.judgements[seat] ?? null}
      wins={game?.wins[seat] ?? 0}
      handCount={game && (game.step === "judge" || game.step === "play" || game.step === "trickDone") ? game.handCounts[seat] : 0}
      isTurn={live && (game.step === "judge" || game.step === "play") && game.turn === seat}
      isWinner={!!game && game.step === "trickDone" && game.trickWinner === seat}
      tag={game ? tagFor(game, seat) : null}
    />
  );

  // Opponents in the order they play after me: clockwise round the table.
  const opponents = game ? Array.from({ length: game.players - 1 }, (_, k) => (you + 1 + k) % game.players) : [];
  const line = view.paused || !game ? "" : statusLine(game);
  const inRound = !!game && (game.step === "judge" || game.step === "play" || game.step === "trickDone");
  const led = game && game.trick.length > 0 && (game.step === "play" || game.step === "trickDone") ? game.trick[0].card.suit : null;
  const called = game ? game.judgements.reduce<number>((sum, j) => sum + (j ?? 0), 0) : 0;
  const judged = game ? game.judgements.filter((j) => j !== null).length : 0;

  return (
    <TableShell
      name="Judgement"
      logo="Judgement"
      meta={
        game && (
          <>
            <span>Round {game.round}</span>
            <TrumpChip suit={game.trump} />
          </>
        )
      }
      rulesTitle="How Judgement plays"
      rules={<RulesJudgement />}
      alert={alert}
      notice={notice}
      onLeave={onLeave}
      scores={game && <ScoreList view={view} game={game} />}
    >
      <main className={styles.board}>
        {!game && (
          <div className={styles.center}>
            <Lobby
              view={view}
              slug="judgement"
              title="Judgement"
              isHost={isHost}
              minPlayers={MIN_PLAYERS}
              disabled={busy || view.paused}
              onStart={() => act({ type: "start" })}
            />
          </div>
        )}

        {game && (
          <>
            <div className={styles.ring}>
              {opponents.map((seat, k) => {
                const dir = direction(k + 1, game.players);
                return (
                  <div key={seat} className={styles.opp} style={{ "--x": dir.x, "--y": dir.y } as CSSProperties}>
                    {plate(seat)}
                  </div>
                );
              })}
            </div>

            <div className={styles.corner}>
              <TrumpBadge suit={game.trump} />
              {inRound && <span className={styles.hands}>{plural(game.handSize, "hand", "hands")}</span>}
              {led && (
                <span className={styles.led}>
                  Led <SuitIcon suit={led} /> {SUIT_NAMES[led]}
                </span>
              )}
            </div>

            <div className={styles.center}>
              {game.step === "judge" && (
                <div className={styles.calls} key={game.round}>
                  <SuitIcon suit={game.trump} className={`${styles.callsSuit} ${isRed(game.trump) ? styles.callsRed : ""}`} />
                  <p className={styles.callsTitle}>{plural(game.handSize, "hand", "hands")} to play for</p>
                  <p className={styles.callsSub}>
                    {judged} of {game.players} called{judged > 0 && ` · ${called} in all`}
                  </p>
                </div>
              )}
              {(game.step === "play" || game.step === "trickDone") && <TrickArea view={view} game={game} />}
            </div>

            {game.step === "judge" && <TrumpReveal suit={game.trump} round={game.round} />}

            {(game.step === "summary" || game.step === "final") && (
              <div className={styles.overlay}>
                {game.step === "summary" ? (
                  <RoundSummary
                    view={view}
                    game={game}
                    isHost={isHost}
                    disabled={busy || view.paused}
                    onReady={() => act({ type: "ready" })}
                    onEnd={() => act({ type: "end" })}
                  />
                ) : (
                  <FinalResults view={view} game={game} disabled={busy || view.paused} onReady={() => act({ type: "ready" })} />
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className={styles.mine}>
        {line && (
          <p className={styles.line} aria-live="polite" data-active={myTurn || myJudgement}>
            {line}
          </p>
        )}
        {myJudgement && game && (
          <JudgePanel
            key={game.round}
            handSize={game.handSize}
            players={game.players}
            forbidden={forbiddenJudgement(game)}
            disabled={busy}
            onJudge={(count) => act({ type: "judge", count })}
          />
        )}
        {game && game.hand.length > 0 ? (
          <Hand cards={game.hand} trump={game.trump} choosable={pickable} selected={active} onChoose={play} />
        ) : (
          <div className={styles.emptyHand} />
        )}
        {game && inRound && <div className={styles.me}>{plate(you, true)}</div>}
      </footer>
    </TableShell>
  );
}
