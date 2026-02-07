import { useState, useEffect } from "react";
import type { RunSummary } from "../../types/game";
import { getRunHistory } from "../../lib/api";

interface RunHistoryProps {
  onBack: () => void;
}

export function RunHistory({ onBack }: RunHistoryProps) {
  const [runs, setRuns] = useState<RunSummary[]>([]);

  useEffect(() => {
    getRunHistory().then(setRuns).catch(() => setRuns([]));
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Run History</h2>

      {runs.length === 0 ? (
        <p style={styles.empty}>No runs yet.</p>
      ) : (
        <div style={styles.list}>
          {runs.map((run, i) => (
            <div key={i} style={styles.run}>
              <div style={styles.runHeader}>
                <span style={{ color: run.victory ? "#FFD700" : "#FF4444" }}>
                  {run.victory ? "Victory" : "Death"}
                </span>
                <span style={styles.score}>Score: {run.score}</span>
              </div>
              <div style={styles.runDetails}>
                Floor {run.floor_reached} | Lv{run.level_reached} |
                {run.enemies_killed} kills | {run.turns_taken} turns
              </div>
              {run.cause_of_death && (
                <div style={styles.cause}>{run.cause_of_death}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <button style={styles.btn} onClick={onBack}>Back</button>
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
    color: "#c0a060",
    margin: "0 0 24px",
  },
  empty: {
    color: "#666",
    margin: "0 0 24px",
  },
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    maxHeight: "60vh",
    overflowY: "auto",
    width: "400px",
    marginBottom: "24px",
  },
  run: {
    padding: "8px 12px",
    backgroundColor: "#111118",
    border: "1px solid #222",
    borderRadius: "4px",
  },
  runHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    marginBottom: "4px",
  },
  score: {
    color: "#FFD700",
  },
  runDetails: {
    fontSize: "12px",
    color: "#888",
  },
  cause: {
    fontSize: "11px",
    color: "#666",
    fontStyle: "italic",
    marginTop: "2px",
  },
  btn: {
    padding: "10px 32px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #444",
    borderRadius: "4px",
    color: "#ccc",
    fontFamily: "monospace",
    fontSize: "14px",
    cursor: "pointer",
  },
};
