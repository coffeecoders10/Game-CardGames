/**
 * Direction from the middle of the table to the seat `rel` places clockwise from you (0 is you, at the
 * bottom). Players are spread evenly round the table, so the same numbers place plates and played cards.
 */
export function direction(rel: number, players: number) {
  const angle = (rel / players) * 2 * Math.PI;
  return { x: Math.round(-Math.sin(angle) * 1000) / 1000, y: Math.round(Math.cos(angle) * 1000) / 1000 };
}
