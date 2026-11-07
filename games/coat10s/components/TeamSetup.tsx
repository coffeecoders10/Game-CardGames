import { TEAM_NAMES, type Team, teamProblem } from "@/games/coat10s/game/engine";
import type { GameView, TableView } from "@/games/coat10s/game/view";
import panel from "@/components/table/TablePanel.module.css";
import { TEAM_LETTER } from "./labels";
import styles from "./TeamSetup.module.css";

interface Props {
  view: TableView;
  game: GameView;
  isHost: boolean;
  disabled: boolean;
  onMove(seat: number, team: Team): void;
  onBegin(): void;
}

/** The host splits the table into two equal teams; everyone else watches it update live. */
export function TeamSetup({ view, game, isHost, disabled, onMove, onBegin }: Props) {
  const problem = teamProblem(game);
  const nameOf = (seat: number) => view.seats[seat]?.name ?? "Player";

  return (
    <div className={`${panel.panel} ${styles.setup}`} role="group" aria-label="Choose teams">
      <h2 className={panel.title}>Choose teams</h2>
      <p className={panel.hint}>
        {isHost
          ? `Put ${game.players / 2} players on each team. Seating order is picked at random when you deal.`
          : "The host is choosing teams. They'll appear here as they change."}
      </p>

      <div className={styles.cols}>
        {([0, 1] as const).map((team) => (
          <section key={team} className={styles.col} data-team={team} aria-label={TEAM_NAMES[team]}>
            <h3 className={styles.colTitle}>
              <span className={styles.badge}>{TEAM_LETTER[team]}</span>
              {TEAM_NAMES[team]}
              <small data-bad={game.teams[team].length !== game.players / 2}>
                {game.teams[team].length}/{game.players / 2}
              </small>
            </h3>
            <ol className={styles.list}>
              {game.teams[team].map((seat) => (
                <li key={seat} className={styles.member}>
                  <span className={styles.pos} aria-hidden="true">
                    {nameOf(seat).slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.name}>
                    {nameOf(seat)}
                    {seat === view.you && <em> (you)</em>}
                  </span>
                  {isHost && (
                    <span className={styles.controls}>
                      <button
                        type="button"
                        className={styles.swap}
                        aria-label={`Move ${nameOf(seat)} to ${TEAM_NAMES[team === 0 ? 1 : 0]}`}
                        disabled={disabled}
                        onClick={() => onMove(seat, team === 0 ? 1 : 0)}
                      >
                        {team === 0 ? "→ B" : "A ←"}
                      </button>
                    </span>
                  )}
                </li>
              ))}
              {game.teams[team].length === 0 && <li className={styles.none}>No players yet</li>}
            </ol>
          </section>
        ))}
      </div>

      {problem && (
        <p className={styles.problem} role="status">
          {problem}
        </p>
      )}

      {isHost ? (
        <button type="button" className={`${panel.primary} ${styles.go}`} disabled={disabled || !!problem} onClick={onBegin}>
          Deal the cards
        </button>
      ) : (
        <p className={panel.fine}>Waiting for the host to start.</p>
      )}
    </div>
  );
}
