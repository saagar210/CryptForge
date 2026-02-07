import { useState, useEffect } from "react";
import type { LifetimeStats } from "../../types/game";
import { getStatistics } from "../../lib/api";

interface StatisticsProps {
  onBack: () => void;
}

function stat(stats: LifetimeStats, key: string): number {
  return stats[key] ?? 0;
}

function findFavoriteClass(stats: LifetimeStats): string {
  let best = "None";
  let bestCount = 0;
  for (const [key, value] of Object.entries(stats)) {
    if (key.startsWith("class_") && value > bestCount) {
      bestCount = value;
      best = key.replace("class_", "");
      best = best.charAt(0).toUpperCase() + best.slice(1);
    }
  }
  return best;
}

function getDeathBreakdown(stats: LifetimeStats): [string, number][] {
  const deaths: [string, number][] = [];
  for (const [key, value] of Object.entries(stats)) {
    if (key.startsWith("deaths_by_") && value > 0) {
      const cause = key
        .replace("deaths_by_", "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      deaths.push([cause, value]);
    }
  }
  deaths.sort((a, b) => b[1] - a[1]);
  return deaths;
}

export function Statistics({ onBack }: StatisticsProps) {
  const [stats, setStats] = useState<LifetimeStats | null>(null);

  useEffect(() => {
    getStatistics().then(setStats).catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Statistics</h1>
        <p style={styles.loading}>Loading...</p>
      </div>
    );
  }

  const totalRuns = stat(stats, "total_runs");
  const totalVictories = stat(stats, "total_victories");
  const winRate = totalRuns > 0 ? (totalVictories / totalRuns) * 100 : 0;
  const deaths = getDeathBreakdown(stats);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Lifetime Statistics</h1>

      <div style={styles.grid}>
        <StatCard label="Total Runs" value={totalRuns} />
        <StatCard label="Victories" value={totalVictories} color="#44FF44" />
        <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} />
        <StatCard label="Total Kills" value={stat(stats, "total_kills")} />
        <StatCard label="Bosses Killed" value={stat(stats, "total_bosses_killed")} />
        <StatCard label="Floors Explored" value={stat(stats, "total_floors")} />
        <StatCard label="Total Turns" value={stat(stats, "total_turns")} />
        <StatCard label="Favorite Class" value={findFavoriteClass(stats)} color="#FFD700" />
      </div>

      {deaths.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Deaths By Cause</h2>
          <div style={styles.deathList}>
            {deaths.map(([cause, count]) => (
              <div key={cause} style={styles.deathRow}>
                <span style={styles.deathCause}>{cause}</span>
                <span style={styles.deathCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button style={styles.btn} onClick={onBack}>Back</button>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={{ ...styles.cardValue, color: color ?? "#ccc" }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "32px", backgroundColor: "#0a0a12", minHeight: "100vh",
    fontFamily: "monospace", color: "#ccc",
  },
  title: { fontSize: "24px", color: "#FFD700", marginBottom: "24px" },
  loading: { color: "#888" },
  grid: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: "16px", marginBottom: "32px", maxWidth: "600px",
  },
  card: {
    backgroundColor: "#111118", border: "1px solid #333", borderRadius: "8px",
    padding: "16px", textAlign: "center",
  },
  cardLabel: { fontSize: "11px", color: "#888", marginBottom: "4px" },
  cardValue: { fontSize: "20px", fontWeight: "bold" },
  section: {
    width: "100%", maxWidth: "400px", marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "16px", color: "#FFD700", marginBottom: "12px", textAlign: "center",
  },
  deathList: {
    backgroundColor: "#111118", border: "1px solid #333", borderRadius: "8px",
    padding: "12px",
  },
  deathRow: {
    display: "flex", justifyContent: "space-between", padding: "4px 8px",
    borderBottom: "1px solid #222",
  },
  deathCause: { color: "#FF6666", fontSize: "13px" },
  deathCount: { color: "#888", fontSize: "13px" },
  btn: {
    padding: "10px 24px", border: "1px solid #444", borderRadius: "4px",
    backgroundColor: "#1a1a2e", color: "#ccc", cursor: "pointer",
    fontFamily: "monospace", fontSize: "14px",
  },
};
