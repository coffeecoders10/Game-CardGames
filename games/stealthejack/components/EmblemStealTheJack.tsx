import type { CSSProperties } from "react";
import { SuitIcon } from "@/components/cards/Suit";
import { BrassToken } from "@/components/ui/BrassToken";
import styles from "./EmblemStealTheJack.module.css";

/** A J and a club as brass tokens: the Steal the Jack emblem. `animated` drops them in, for the game's landing page. */
export function EmblemStealTheJack({ size = "clamp(76px, 20vw, 118px)", animated }: { size?: string; animated?: boolean }) {
  return (
    <span className={`${styles.emblem} ${animated ? styles.animated : ""}`} style={{ "--token": size } as CSSProperties}>
      <BrassToken>J</BrassToken>
      <BrassToken>
        <SuitIcon suit="C" className={styles.club} />
      </BrassToken>
    </span>
  );
}
