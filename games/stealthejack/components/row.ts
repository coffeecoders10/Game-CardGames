import type { CSSProperties } from "react";

/** Cards to a row: one row up to 13 cards, two rows beyond that so cards stay big enough to read. */
export const perRow = (n: number) => Math.max(1, n <= 13 ? n : Math.ceil(n / 2));

/** CSS variables for the card at position `k` of `n` in a `Row.module.css` row. */
export const rowVars = (k: number, per: number) =>
  ({ "--k": k, "--col": k % per, "--line": Math.floor(k / per) }) as CSSProperties;

export const rowStyle = (n: number) => ({ "--per": perRow(n) }) as CSSProperties;
