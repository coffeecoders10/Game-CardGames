"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { type Card, type Suit, SUIT_NAMES, cardKey } from "@/lib/cards/cards";
import { useMediaQuery } from "@/lib/hooks/useClientValue";
import { SuitIcon } from "@/components/cards/Suit";
import { Lobby } from "@/components/table/Lobby";
import type { TableProps } from "@/components/table/RoomClient";
import { TableShell } from "@/components/table/TableShell";
import { PLAYER_COUNTS, type Team, legalCards } from "@/games/coat10s/game/engine";
import type { GameView, TableView } from "@/games/coat10s/game/view";
import type { GameAction } from "@/games/coat10s/net/protocol";
import { Hand } from "./Hand";
import { FinalResults, RoundSummary, TrumpBadge, TrumpReveal } from "./Overlays";
import { Plate } from "./Plate";
import { RulesCoat10s } from "./RulesCoat10s";
import { TeamSetup } from "./TeamSetup";
import { TeamStrip } from "./TeamStrip";
import { TrickArea } from "./TrickArea";
import { direction } from "./ring";
import styles from "./Table.module.css";

/** Which round's trump we last saw, so a reveal plays only when trump is named while you watch. */
interface Seen {
  round: number;
  trump: Suit | null;
}

export function Table({ view, status, notice, busy, isHost, act, onLeave }: TableProps<TableView, GameAction>) {
  const game = view.game;
  const you = view.you;
  const touch = useMediaQuery("(pointer: coarse)");
  const [selected, setSelected] = useState<string | null>(null);
  const [seen, setSeen] = useState<Seen | null>(null);
  const [reveal, setReveal] = useState<{ suit: Suit; by: string; round: number } | null>(null);

  const nameOf = (seat: number) => (seat === you ? "You" : (view.seats[seat]?.name ?? "Player"));

  // Trump is announced the moment it is named; setting state while rendering keeps it out of an effect.
  if (game && (seen?.round !== game.round || seen.trump !== game.trump)) {
    setSeen({ round: game.round, trump: game.trump });
    if (seen && seen.round === game.round && seen.trump === null && game.trump !== null) {
      setReveal({ suit: game.trump, by: game.trumpBy === null ? "a player" : nameOf(game.trumpBy), round: game.round });
    } else if (reveal) {
      setReveal(null);
    }
  }

  const live = !!game && !view.paused;
  const myTurn = live && game.step === "play" && game.turn === you;

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
    switch (g.step) {
      case "teams":
        return "";
      case "play": {
        if (g.turn !== you) return `${nameOf(g.turn)}'s turn`;
        if (g.trick.length === 0) return "Your lead — play any card";
        const led = g.trick[0].card.suit;
        if (g.hand.some((c) => c.suit === led)) return `Your turn — follow ${SUIT_NAMES[led]}`;
        return g.trump === null ? `No ${SUIT_NAMES[led]} — your discard names trump` : `No ${SUIT_NAMES[led]} — play anything`;
      }
      case "trickDone":
        return ""; // the table itself announces the winner
      case "summary":
        return "Round complete";
      case "final":
        return "Match over";
    }
  }

  /** The small label on a plate: who opened the round, then who leads (or led) the hand on the table. */
  function tagFor(g: GameView, seat: number): string | null {
    if (g.step === "play" && g.trick.length === 0) return seat === g.turn ? (g.tricksPlayed === 0 ? "Opens" : "Leads") : null;
    if ((g.step === "play" || g.step === "trickDone") && g.trick.length > 0) return seat === g.trick[0].seat ? "Led" : null;
    return null;
  }

  const inRound = !!game && (game.step === "play" || game.step === "trickDone");
  const teamOfSeat = (g: GameView, seat: number): Team => (g.teams[0].includes(seat) ? 0 : 1);

  const plate = (g: GameView, seat: number, me?: boolean) => (
    <Plate
      name={view.seats[seat]?.name ?? null}
      connected={view.seats[seat]?.connected ?? false}
      isYou={seat === you}
      me={me}
      team={teamOfSeat(g, seat)}
      handCount={inRound ? g.handCounts[seat] : 0}
      isTurn={live && g.step === "play" && g.turn === seat}
      isWinner={g.step === "trickDone" && g.trickWinner === seat}
      tag={tagFor(g, seat)}
    />
  );

  const seated = view.seats.filter((s) => s.name !== null).length;
  const countOk = (PLAYER_COUNTS as readonly number[]).includes(seated);

  // Opponents in the fixed playing order after me, which alternates teams all the way round.
  const mePos = game ? game.order.indexOf(you) : 0;
  const opponents = game && game.order.length > 0 ? Array.from({ length: game.players - 1 }, (_, k) => game.order[(mePos + 1 + k) % game.players]) : [];
  const line = view.paused || !game ? "" : statusLine(game);
  const led = game && game.trick.length > 0 && inRound ? game.trick[0].card.suit : null;
  const lastWinner = game && game.step === "play" && game.lastWinner !== null ? game.lastWinner : null;
  const myTeam = game && game.order.length > 0 ? teamOfSeat(game, you) : 0;
  const trumpBy = game && game.trumpBy !== null ? nameOf(game.trumpBy) : null;

  return (
    <TableShell
      name="Coat of 10s"
      logo="Coat of 10s"
      meta={game && game.round > 0 && <span>Round {game.round}</span>}
      rulesTitle="How Coat of 10s plays"
      rules={<RulesCoat10s />}
      alert={alert}
      notice={notice}
      onLeave={onLeave}
      scores={game && game.round > 0 ? <TeamStrip view={view} game={game} mine={myTeam} leading={null} /> : undefined}
    >
      <main className={styles.board}>
        <div className={styles.felt}>
          {!game && (
            <div className={styles.center}>
              <Lobby
                view={view}
                slug="coat10s"
                title="Coat of 10s"
                isHost={isHost}
                minPlayers={4}
                note={
                  countOk
                    ? isHost
                      ? `${seated} players here. Next, you'll split them into two teams of ${seated / 2}.`
                      : `${seated} players here. Waiting for the host to choose teams.`
                    : seated < 4
                      ? `${seated} of 4–8 players seated. Coat of 10s needs 4, 6 or 8; send the code to ${4 - seated === 1 ? "one more friend" : "more friends"}.`
                      : `${seated} players seated. Coat of 10s needs 4, 6 or 8, so wait for one more (or someone to step out).`
                }
                startLabel="Choose teams"
                disabled={busy || view.paused || !countOk}
                onStart={() => act({ type: "start" })}
              />
            </div>
          )}

          {game?.step === "teams" && (
            <div className={styles.center}>
              <TeamSetup
                view={view}
                game={game}
                isHost={isHost}
                disabled={busy || view.paused}
                onMove={(seat, team) => act({ type: "team", seat, team })}
                onBegin={() => act({ type: "begin" })}
              />
            </div>
          )}

          {game && game.round > 0 && (
            <>
              <div className={styles.ring}>
                {opponents.map((seat, k) => {
                  const dir = direction(k + 1, game.players);
                  return (
                    <div key={seat} className={styles.opp} style={{ "--x": dir.x, "--y": dir.y } as CSSProperties}>
                      {plate(game, seat)}
                    </div>
                  );
                })}
              </div>

              <div className={styles.center}>{inRound && <TrickArea view={view} game={game} />}</div>

              {reveal && reveal.round === game.round && game.trump === reveal.suit && (
                <TrumpReveal suit={reveal.suit} by={reveal.by} round={reveal.round} />
              )}
            </>
          )}
        </div>

        {game && (game.step === "summary" || game.step === "final") && (
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
      </main>

      <footer className={styles.mine}>
        {game && inRound && (led || (lastWinner !== null && game.trick.length === 0)) && (
          <div className={styles.corner}>
            {led && (
              <span className={styles.led}>
                Led <SuitIcon suit={led} /> {SUIT_NAMES[led]}
              </span>
            )}
            {lastWinner !== null && game.trick.length === 0 && (
              <span className={styles.led} key={game.tricksPlayed}>
                Last hand: {nameOf(lastWinner)}
              </span>
            )}
          </div>
        )}
        {game && inRound && (
          <div className={styles.trump}>
            <TrumpBadge suit={game.trump} by={trumpBy} />
          </div>
        )}
        {line && (
          <p className={styles.line} aria-live="polite" data-active={myTurn}>
            {line}
          </p>
        )}
        {game && game.hand.length > 0 ? (
          <Hand cards={game.hand} trump={game.trump} choosable={pickable} selected={active} onChoose={play} />
        ) : (
          <div className={styles.emptyHand} />
        )}
        {game && inRound && <div className={styles.me}>{plate(game, you, true)}</div>}
      </footer>
    </TableShell>
  );
}
