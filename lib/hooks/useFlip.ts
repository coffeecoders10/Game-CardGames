import { type RefObject, useLayoutEffect, useRef } from "react";

/**
 * Slides cards to their new slot when the hand is re-sorted, dealt into, or thinned out.
 * `skip` is the key of a card that is being dragged by hand and must not be animated.
 */
export function useFlip(ref: RefObject<HTMLDivElement | null>, skip: string | null = null) {
  const previous = useRef(new Map<string, [number, number]>());
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, [number, number]>();
    for (const child of Array.from(el.children) as HTMLElement[]) {
      const key = child.dataset.key;
      if (!key) continue;
      // Layout position (not the transformed one) so the deal-in animation can't skew it.
      const pos: [number, number] = [child.offsetLeft, child.offsetTop];
      next.set(key, pos);
      const old = previous.current.get(key);
      if (old && !reduce && key !== skip && (old[0] !== pos[0] || old[1] !== pos[1])) {
        child.animate(
          [{ transform: `translate(${old[0] - pos[0]}px, ${old[1] - pos[1]}px)` }, { transform: "none" }],
          { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
      }
    }
    previous.current = next;
  });
}
