import { useState, useEffect } from "react";
import type { AchievementStatus, AchievementCategory } from "../../types/game";
import { getAchievements } from "../../lib/api";

interface AchievementsProps {
  onBack: () => void;
}

const CATEGORIES: AchievementCategory[] = ["Exploration", "Combat", "Collection", "Challenge", "Misc"];

export function Achievements({ onBack }: AchievementsProps) {
  const [achievements, setAchievements] = useState<AchievementStatus[]>([]);

  useEffect(() => {
    getAchievements().then(setAchievements).catch(() => {});
  }, []);

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: achievements.filter((a) => a.category === cat),
  }));

  const total = achievements.length;
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Achievements</h2>
      <p style={styles.subtitle}>
        {unlocked} / {total} unlocked
      </p>

      <div style={styles.grid}>
        {grouped.map((group) => (
          <div key={group.category}>
            <h3 style={styles.categoryTitle}>{group.category}</h3>
            {group.items.map((a) => (
              <div key={a.id} style={a.unlocked ? styles.card : styles.cardLocked}>
                <div style={styles.cardHeader}>
                  <span style={a.unlocked ? styles.name : styles.nameLocked}>{a.name}</span>
                  {a.unlocked && <span style={styles.check}>&#10003;</span>}
                </div>
                <p style={styles.desc}>{a.description}</p>
                {!a.unlocked && a.target > 1 && (
                  <div style={styles.progressRow}>
                    <div style={styles.progressBg}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${Math.min((a.progress / a.target) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span style={styles.progressText}>
                      {a.progress}/{a.target}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <button style={styles.btn} onClick={onBack}>
        Back
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#0a0a12",
    fontFamily: "monospace",
    padding: "24px",
    overflowY: "auto",
  },
  title: {
    fontSize: "28px",
    color: "#c0a060",
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#888",
    margin: "0 0 24px",
  },
  grid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    width: "100%",
    maxWidth: "500px",
  },
  categoryTitle: {
    fontSize: "16px",
    color: "#c0a060",
    borderBottom: "1px solid #333",
    paddingBottom: "4px",
    margin: "0 0 8px",
  },
  card: {
    backgroundColor: "#1a1a2e",
    border: "1px solid #c0a060",
    borderRadius: "4px",
    padding: "8px 12px",
    marginBottom: "6px",
  },
  cardLocked: {
    backgroundColor: "#111118",
    border: "1px solid #333",
    borderRadius: "4px",
    padding: "8px 12px",
    marginBottom: "6px",
    opacity: 0.7,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: "14px",
    color: "#c0a060",
    fontWeight: "bold",
  },
  nameLocked: {
    fontSize: "14px",
    color: "#666",
    fontWeight: "bold",
  },
  check: {
    color: "#44FF44",
    fontSize: "16px",
  },
  desc: {
    fontSize: "12px",
    color: "#888",
    margin: "2px 0 0",
  },
  progressRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "4px",
  },
  progressBg: {
    flex: 1,
    height: "6px",
    backgroundColor: "#222",
    borderRadius: "3px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#c0a060",
    transition: "width 0.2s",
  },
  progressText: {
    fontSize: "11px",
    color: "#666",
    minWidth: "40px",
    textAlign: "right" as const,
  },
  btn: {
    marginTop: "24px",
    padding: "8px 24px",
    backgroundColor: "#111118",
    border: "1px solid #333",
    borderRadius: "4px",
    color: "#888",
    fontFamily: "monospace",
    fontSize: "13px",
    cursor: "pointer",
  },
};
