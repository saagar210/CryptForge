import { useEffect, useState } from "react";
import { hasSaveGame } from "../../lib/api";

interface MainMenuProps {
  onNewGame: () => void;
  onContinue: () => void;
  onDailyChallenge: () => void;
  onHighScores: () => void;
  onRunHistory: () => void;
  onAchievements: () => void;
  onStatistics: () => void;
  onSettings: () => void;
}

export function MainMenu({ onNewGame, onContinue, onDailyChallenge, onHighScores, onRunHistory, onAchievements, onStatistics, onSettings }: MainMenuProps) {
  const [hasSave, setHasSave] = useState(false);
  useEffect(() => {
    hasSaveGame().then(setHasSave).catch(() => setHasSave(false));
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>CryptForge</h1>
      <p style={styles.subtitle}>A Roguelike Dungeon Crawler</p>

      <div style={styles.menu}>
        <button style={styles.btn} onClick={onNewGame}>
          New Game
        </button>

        {hasSave && (
          <button style={styles.btn} onClick={onContinue}>
            Continue
          </button>
        )}

        <button style={styles.btn} onClick={onDailyChallenge}>
          Daily Challenge
        </button>

        <div style={styles.divider} />

        <button style={styles.btnSmall} onClick={onHighScores}>
          High Scores
        </button>
        <button style={styles.btnSmall} onClick={onRunHistory}>
          Run History
        </button>
        <button style={styles.btnSmall} onClick={onAchievements}>
          Achievements
        </button>
        <button style={styles.btnSmall} onClick={onStatistics}>
          Statistics
        </button>
        <button style={styles.btnSmall} onClick={onSettings}>
          Settings
        </button>
      </div>
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
  },
  title: {
    fontSize: "48px",
    color: "#c0a060",
    margin: "0 0 8px",
    textShadow: "0 0 20px rgba(192,160,96,0.3)",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666",
    margin: "0 0 32px",
  },
  menu: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    width: "260px",
    alignItems: "center",
  },
  btn: {
    width: "100%",
    padding: "12px 24px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #c0a060",
    borderRadius: "4px",
    color: "#c0a060",
    fontFamily: "monospace",
    fontSize: "16px",
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  btnSmall: {
    width: "100%",
    padding: "8px 24px",
    backgroundColor: "#111118",
    border: "1px solid #333",
    borderRadius: "4px",
    color: "#888",
    fontFamily: "monospace",
    fontSize: "13px",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: "8px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #444",
    borderRadius: "4px",
    color: "#ccc",
    fontFamily: "monospace",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  divider: {
    borderTop: "1px solid #222",
    width: "100%",
    margin: "8px 0",
  },
};
