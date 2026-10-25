"use client";

import { useState } from "react";
import { useClientValue } from "@/lib/hooks/useClientValue";
import panel from "./TablePanel.module.css";
import styles from "./Lobby.module.css";

interface Props {
  view: { code: string; seats: { name: string | null; connected: boolean }[] };
  /** Route segment of the game, for the invite link: `/games/<slug>?code=<code>`. */
  slug: string;
  /** Game name, for the share sheet. */
  title: string;
  isHost: boolean;
  disabled: boolean;
  /** Fewest players that can start; defaults to every seat. */
  minPlayers?: number;
  onStart(): void;
}

/** Waiting room shown on the felt until every seat is filled. */
export function Lobby({ view, slug, title, isHost, disabled, minPlayers, onStart }: Props) {
  const [copied, setCopied] = useState(false);
  const link = useClientValue(() => `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/games/${slug}?code=${view.code}`, "");
  const canShare = useClientValue(() => typeof navigator.share === "function", false);
  const total = view.seats.length;
  const seated = view.seats.filter((s) => s.name !== null && s.connected).length;
  const needed = minPlayers ?? total;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code and link are still on screen to copy by hand.
    }
  };

  return (
    <div className={panel.panel}>
      <p className={styles.label}>Table code</p>
      <p className={styles.code} aria-label={view.code.split("").join(" ")}>
        {view.code}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={copy}>
          {copied ? "Link copied" : "Copy invite link"}
        </button>
        {canShare && (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => navigator.share({ title: `Join my ${title} table`, url: link }).catch(() => {})}
          >
            Share
          </button>
        )}
      </div>

      <p className={panel.hint} role="status">
        {seated < needed
          ? `${seated} of ${total} players seated. Send the code to ${needed - seated === 1 ? "one more friend" : "more friends"}.`
          : minPlayers !== undefined && seated < total
            ? `${seated} of ${total} seats filled. Deal now, or wait for more friends.`
            : isHost
              ? "Everyone's here."
              : "Everyone's here. Waiting for the host to deal."}
      </p>

      {isHost && (
        <button type="button" className={`${panel.primary} ${styles.start}`} disabled={disabled || seated < needed} onClick={onStart}>
          Deal the cards
        </button>
      )}
    </div>
  );
}
