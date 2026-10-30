"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Card } from "@/lib/cards/cards";
import { Button } from "@/components/ui/Button";
import { GameLanding } from "@/components/ui/GameLanding";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/TextField";
import { useClientValue } from "@/lib/hooks/useClientValue";
import { newRoomCode, normalizeRoomCode } from "@/lib/net/crypto";
import { MAX_NAME_LENGTH, cleanName } from "@/lib/net/names";
import type { TableStorage } from "@/lib/net/storage";
import styles from "./GameHome.module.css";

interface Props {
  /** Route segment: tables live at `/games/<slug>/room/<code>`. */
  slug: string;
  name: string;
  emblem: ReactNode;
  tagline: string;
  fan: Card[];
  storage: TableStorage;
}

type Tab = "create" | "join";

const TABS: { id: Tab; label: string }[] = [
  { id: "create", label: "Create" },
  { id: "join", label: "Join" },
];

/** Landing page for a multiplayer game: pick a name, then open a table or join one by code. */
export function GameHome({ slug, name: gameName, emblem, tagline, fan, storage }: Props) {
  const router = useRouter();
  const stored = useClientValue(storage.loadName, "");
  const [typed, setTyped] = useState<string | null>(null);
  // An invite link (`/games/<slug>?code=ABC123`) arrives with the table code filled in and the Join tab open.
  const invited = useClientValue(() => normalizeRoomCode(new URLSearchParams(location.search).get("code") ?? ""), "");
  const [pickedTab, setTab] = useState<Tab | null>(null);
  const tab = pickedTab ?? (invited ? "join" : "create");
  const [typedCode, setTypedCode] = useState<string | null>(null);
  const joinCode = typedCode ?? invited;
  const name = typed ?? stored;
  const ready = name.trim().length > 0;

  const enter = (code: string, host: boolean) => {
    storage.saveName(cleanName(name));
    if (host) storage.markHosting(code);
    router.push(`/games/${slug}/room/${code}`);
  };

  return (
    <GameLanding name={gameName} emblem={emblem} tagline={tagline} fan={fan}>
      <Panel aria-label="Start playing">
        <div className={styles.tabs} role="tablist" aria-label="Create or join a table">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              className={styles.tab}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <TextField
          id="name"
          label="Your name"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="nickname"
          placeholder="Who's sitting down?"
          onChange={(e) => setTyped(e.target.value)}
        />

        {tab === "create" ? (
          <Button
            id="panel-create"
            role="tabpanel"
            aria-labelledby="tab-create"
            className={styles.open}
            disabled={!ready}
            onClick={() => enter(newRoomCode(), true)}
          >
            Open a table
          </Button>
        ) : (
          <form
            id="panel-join"
            role="tabpanel"
            aria-labelledby="tab-join"
            className={styles.join}
            onSubmit={(e) => {
              e.preventDefault();
              if (ready && joinCode.length === 6) enter(joinCode, false);
            }}
          >
            <TextField
              id="code"
              label="Table code"
              hideLabel
              variant="code"
              value={joinCode}
              onChange={(e) => setTypedCode(normalizeRoomCode(e.target.value))}
              placeholder="CODE"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
            <Button type="submit" variant="secondary" disabled={!ready || joinCode.length !== 6}>
              Join
            </Button>
          </form>
        )}
      </Panel>
    </GameLanding>
  );
}
