import type { PlayerState } from "../../types/game";

interface HUDProps {
  player: PlayerState;
  floor: number;
  turn: number;
}

export function HUD({ player, floor, turn }: HUDProps) {
  const hpPct = player.max_hp > 0 ? (player.hp / player.max_hp) * 100 : 0;
  const xpPct = player.xp_to_next > 0 ? (player.xp / player.xp_to_next) * 100 : 0;
  const hpColor = hpPct > 60 ? "#44FF44" : hpPct > 30 ? "#FFAA00" : "#FF4444";

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={styles.label}>Floor {floor}</span>
        <span style={styles.label}>Turn {turn}</span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>HP</span>
        <div style={styles.barBg}>
          <div style={{ ...styles.barFill, width: `${hpPct}%`, backgroundColor: hpColor }} />
        </div>
        <span style={styles.value}>{player.hp}/{player.max_hp}</span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>XP</span>
        <div style={styles.barBg}>
          <div style={{ ...styles.barFill, width: `${xpPct}%`, backgroundColor: "#8888FF" }} />
        </div>
        <span style={styles.value}>Lv{player.level}</span>
      </div>

      <div style={styles.stats}>
        <span>ATK {player.attack}</span>
        <span>DEF {player.defense}</span>
        <span>SPD {player.speed}</span>
      </div>

      {player.status_effects.length > 0 && (
        <div style={styles.effects}>
          {player.status_effects.map((e, i) => (
            <span key={i} style={styles.effect}>{e.effect_type}({e.duration})</span>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "8px",
    backgroundColor: "#111118",
    borderBottom: "1px solid #333",
    fontFamily: "monospace",
    fontSize: "13px",
    color: "#ccc",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  label: {
    color: "#888",
    minWidth: "28px",
  },
  value: {
    color: "#ccc",
    minWidth: "60px",
    textAlign: "right" as const,
    fontSize: "12px",
  },
  barBg: {
    flex: 1,
    height: "10px",
    backgroundColor: "#222",
    borderRadius: "2px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    transition: "width 0.15s ease",
  },
  stats: {
    display: "flex",
    gap: "16px",
    color: "#aaa",
    fontSize: "12px",
  },
  effects: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap" as const,
  },
  effect: {
    fontSize: "11px",
    color: "#FF8800",
    backgroundColor: "#221100",
    padding: "1px 4px",
    borderRadius: "2px",
  },
};
