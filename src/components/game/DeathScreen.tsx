import type { GameOverInfo } from "../../types/game";

interface DeathScreenProps {
  info: GameOverInfo;
  onNewGame: () => void;
  onMainMenu: () => void;
}

export function DeathScreen({ info, onNewGame, onMainMenu }: DeathScreenProps) {
  const isVictory = info.run_summary.victory;

  return (
    <div style={styles.container}>
      <h1 style={{ ...styles.title, color: isVictory ? "#FFD700" : "#FF4444" }}>
        {isVictory ? "Victory!" : "You Died"}
      </h1>

      {info.epitaph && <p style={styles.epitaph}>{info.epitaph}</p>}

      {!isVictory && info.cause_of_death && (
        <p style={styles.cause}>{info.cause_of_death}</p>
      )}

      <div style={styles.stats}>
        <StatRow label="Score" value={info.final_score.toString()} />
        <StatRow label="Floor" value={info.run_summary.floor_reached.toString()} />
        <StatRow label="Level" value={info.run_summary.level_reached.toString()} />
        <StatRow label="Enemies" value={info.run_summary.enemies_killed.toString()} />
        <StatRow label="Bosses" value={info.run_summary.bosses_killed.toString()} />
        <StatRow label="Turns" value={info.run_summary.turns_taken.toString()} />
        <StatRow label="Seed" value={info.run_summary.seed} />
      </div>

      <div style={styles.buttons}>
        <button style={styles.btn} onClick={onNewGame}>New Game</button>
        <button style={styles.btn} onClick={onMainMenu}>Main Menu</button>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statRow}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "#0a0a12",
    fontFamily: "monospace",
    color: "#ccc",
    padding: "32px",
  },
  title: {
    fontSize: "36px",
    margin: "0 0 16px",
  },
  epitaph: {
    fontStyle: "italic",
    color: "#888",
    fontSize: "14px",
    margin: "0 0 16px",
    maxWidth: "400px",
    textAlign: "center" as const,
  },
  cause: {
    color: "#FF6666",
    fontSize: "14px",
    margin: "0 0 24px",
  },
  stats: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
    width: "280px",
    marginBottom: "24px",
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 8px",
    backgroundColor: "#111118",
    borderRadius: "2px",
  },
  statLabel: {
    color: "#888",
  },
  statValue: {
    color: "#ccc",
  },
  buttons: {
    display: "flex",
    gap: "16px",
  },
  btn: {
    padding: "10px 24px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #444",
    borderRadius: "4px",
    color: "#ccc",
    fontFamily: "monospace",
    fontSize: "14px",
    cursor: "pointer",
  },
};
