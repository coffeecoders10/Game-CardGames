import type { CSSProperties } from "react";
import { BrassToken } from "@/components/ui/BrassToken";
import styles from "./EmblemCoat10s.module.css";

/** Two brass tokens, a 10 and a coat of arms' spade-less "C": the Coat of 10s emblem. `animated` drops them in. */
export function EmblemCoat10s({ size = "clamp(76px, 20vw, 118px)", animated }: { size?: string; animated?: boolean }) {
  return (
    <span className={`${styles.emblem} ${animated ? styles.animated : ""}`} style={{ "--token": size } as CSSProperties}>
      <BrassToken>10</BrassToken>
      <BrassToken>
        <span className={styles.coat}>×4</span>
      </BrassToken>
    </span>
  );
}
