"use client";

import { type KeyboardEvent, type PointerEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type Card, cardKey } from "@/lib/cards/cards";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { useFlip } from "@/lib/hooks/useFlip";
import type { Slot } from "@/games/stealthejack/game/engine";
import { perRow, rowStyle, rowVars } from "./row";
import styles from "./Row.module.css";

interface Props {
  /** The hand in the order the host holds it. */
  slots: readonly Slot[];
  /** Keys of the cards chosen for a pair. */
  selected: readonly string[];
  /** Whether tapping a card chooses it (it's your turn to discard). */
  canSelect: boolean;
  /** The card that was just taken from the other player. */
  freshId: number | null;
  onSelect(card: Card): void;
  /** The new left-to-right order, as slot ids, after the player moved a card. */
  onArrange(order: number[]): void;
}

const signature = (slots: readonly Slot[]) => slots.map((s) => s.id).join(",");

/** `slots` reordered to follow `order`; ids that aren't in `order` keep their place at the end. */
function applyOrder(slots: readonly Slot[], order: readonly number[]): Slot[] {
  const byId = new Map(slots.map((s) => [s.id, s]));
  const out: Slot[] = [];
  for (const id of order) {
    const slot = byId.get(id);
    if (slot) {
      out.push(slot);
      byId.delete(id);
    }
  }
  return [...out, ...slots.filter((s) => byId.has(s.id))];
}

interface Drag {
  key: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
  /** Latest order while dragging; what gets sent on release. */
  order: number[];
  start: string;
}

/**
 * Your cards in a line. Tap to choose a pair; drag a card (or hold Shift and use the arrow keys) to
 * rearrange. Nothing is sent until you let go, and the arrangement shows at once while the host
 * confirms it. The host's order always wins: the pending order only stands while it still matches.
 */
export function Hand({ slots, selected, canSelect, freshId, onSelect, onArrange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<number[] | null>(null);
  const [pending, setPending] = useState<{ base: string; order: number[] } | null>(null);

  const base = signature(slots);
  const shown = useMemo(() => {
    if (dragOrder) return applyOrder(slots, dragOrder);
    if (pending && pending.base === base) return applyOrder(slots, pending.order);
    return slots as Slot[];
  }, [slots, base, dragOrder, pending]);

  useFlip(ref, dragKey);

  const per = perRow(shown.length);
  const slotByKey = useMemo(() => new Map(shown.map((s) => [cardKey(s.card), s])), [shown]);

  /** Keeps the dragged card under the pointer, whatever slot it currently sits in. */
  const follow = () => {
    const d = drag.current;
    const box = ref.current;
    if (!d?.moved || !box) return;
    const el = Array.from(box.children).find((c) => (c as HTMLElement).dataset.key === d.key) as HTMLElement | undefined;
    if (!el) return;
    const rect = box.getBoundingClientRect();
    const tx = d.x - rect.left - (el.offsetLeft + el.offsetWidth / 2);
    const ty = d.y - rect.top - (el.offsetTop + el.offsetHeight / 2);
    el.style.translate = `${tx}px ${ty}px`;
  };
  useLayoutEffect(follow);

  /** The order if the dragged card were dropped where the pointer is now. */
  const orderAt = (d: Drag): number[] => {
    const box = ref.current;
    const dragged = slotByKey.get(d.key);
    if (!box || !dragged) return d.order;
    const rect = box.getBoundingClientRect();
    const others = (Array.from(box.children) as HTMLElement[])
      .filter((el) => el.dataset.key !== d.key)
      .flatMap((el) => {
        const slot = slotByKey.get(el.dataset.key ?? "");
        if (!slot) return [];
        const cx = rect.left + el.offsetLeft + el.offsetWidth / 2;
        const cy = rect.top + el.offsetTop + el.offsetHeight / 2;
        return [{ id: slot.id, cx, dist: Math.hypot(d.x - cx, d.y - cy) }];
      });
    if (others.length === 0) return d.order;
    const nearest = others.reduce((a, b) => (b.dist < a.dist ? b : a));
    const ids = others.map((o) => o.id);
    ids.splice(ids.indexOf(nearest.id) + (d.x > nearest.cx ? 1 : 0), 0, dragged.id);
    return ids;
  };

  const commit = (order: number[]) => {
    setPending({ base, order });
    onArrange(order);
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-key]");
    if (!el?.dataset.key || !ref.current?.contains(el)) return;
    drag.current = {
      key: el.dataset.key,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      order: shown.map((s) => s.id),
      start: signature(shown),
    };
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 8) return;
      d.moved = true;
      ref.current?.setPointerCapture(e.pointerId);
      setDragKey(d.key);
    }
    const order = orderAt(d);
    if (order.join(",") !== d.order.join(",")) {
      d.order = order;
      setDragOrder(order);
    }
    follow();
  };

  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    // The click that follows a drag must not also choose the card.
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    const el = (Array.from(ref.current?.children ?? []) as HTMLElement[]).find((c) => c.dataset.key === d.key);
    if (el) el.style.translate = "";
    setDragKey(null);
    setDragOrder(null);
    if (d.order.join(",") !== d.start) commit(d.order);
  };

  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.shiftKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    const key = (e.target as HTMLElement).closest<HTMLElement>("[data-key]")?.dataset.key;
    const at = shown.findIndex((s) => cardKey(s.card) === key);
    const to = at + (e.key === "ArrowLeft" ? -1 : 1);
    if (at < 0 || to < 0 || to >= shown.length) return;
    e.preventDefault();
    const ids = shown.map((s) => s.id);
    [ids[at], ids[to]] = [ids[to], ids[at]];
    commit(ids);
  };

  return (
    <div
      ref={ref}
      className={`${styles.row} ${styles.mine}`}
      style={rowStyle(shown.length)}
      role="group"
      aria-label="Your cards. Drag a card, or hold Shift and press an arrow key, to rearrange them."
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={keys}
    >
      {shown.map((slot, k) => {
        const key = cardKey(slot.card);
        const chosen = selected.includes(key);
        return (
          <PlayingCard
            key={key}
            card={slot.card}
            className={[
              styles.card,
              styles.movable,
              chosen ? styles.lift : "",
              dragKey === key ? styles.dragging : "",
            ].join(" ")}
            style={rowVars(k, per)}
            selected={chosen}
            fresh={freshId === slot.id}
            dataKey={key}
            onClick={() => !suppressClick.current && canSelect && onSelect(slot.card)}
          />
        );
      })}
    </div>
  );
}
