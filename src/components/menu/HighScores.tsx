import { useState, useEffect } from "react";
import type { HighScore } from "../../types/game";
import { getHighScores } from "../../lib/api";

interface HighScoresProps {
  onBack: () => void;
}

export function HighScores({ onBack }: HighScoresProps) {
  const [scores, setScores] = useState<HighScore[]>([]);

  useEffect(() => {
    getHighScores().then(setScores).catch(() => setScores([]));
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>High Scores</h2>

      {scores.length === 0 ? (
        <p style={styles.empty}>No scores yet. Play a game!</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Score</th>
              <th style={styles.th}>Floor</th>
              <th style={styles.th}>Seed</th>
              <th style={styles.th}>Result</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.rank}>
                <td style={styles.td}>{s.rank}</td>
                <td style={styles.tdScore}>{s.score}</td>
                <td style={styles.td}>{s.floor_reached}</td>
                <td style={styles.td}>{s.seed}</td>
                <td style={{ ...styles.td, color: s.victory ? "#FFD700" : "#FF4444" }}>
                  {s.victory ? "Victory" : "Death"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  table: {
    borderCollapse: "collapse" as const,
    marginBottom: "24px",
  },
  th: {
    padding: "6px 16px",
    textAlign: "left" as const,
    color: "#888",
    borderBottom: "1px solid #333",
    fontSize: "12px",
  },
  td: {
    padding: "6px 16px",
    fontSize: "13px",
    color: "#aaa",
  },
  tdScore: {
    padding: "6px 16px",
    fontSize: "13px",
    color: "#FFD700",
    fontWeight: "bold",
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
