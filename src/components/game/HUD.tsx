import { useState } from "react";
import type { PlayerState } from "../../types/game";

interface HUDProps {
  player: PlayerState;
  floor: number;
  turn: number;
  seed: number;
}

export function HUD({ player, floor, turn, seed }: HUDProps) {
  const [seedCopied, setSeedCopied] = useState(false);

  const copySeed = () => {
    navigator.clipboard.writeText(seed.toString()).then(() => {
      setSeedCopied(true);
      setTimeout(() => setSeedCopied(false), 1500);
    }).catch(() => {});
  };
  const hpPct = player.max_hp > 0 ? (player.hp / player.max_hp) * 100 : 0;
  const xpPct = player.xp_to_next > 0 ? (player.xp / player.xp_to_next) * 100 : 0;
  const manaPct = player.max_mana > 0 ? (player.mana / player.max_mana) * 100 : 0;
  const hungerPct = player.max_hunger > 0 ? (player.hunger / player.max_hunger) * 100 : 0;
  const hpColor = hpPct > 60 ? "#44FF44" : hpPct > 30 ? "#FFAA00" : "#FF4444";
  const hungerColor = hungerPct > 50 ? "#44FF44" : hungerPct > 25 ? "#FFAA00" : "#FF4444";

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={styles.label}>{player.player_class} </span>
        <span style={styles.label}>Floor {floor}</span>
        <span style={styles.label}>Turn {turn}</span>
        <span
          style={styles.seed}
          onClick={copySeed}
          title="Click to copy seed"
        >
          {seedCopied ? "Copied!" : `Seed: ${seed}`}
        </span>
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

      {player.max_mana > 0 && (
        <div style={styles.row}>
          <span style={styles.label}>MP</span>
          <div style={styles.barBg}>
            <div style={{ ...styles.barFill, width: `${manaPct}%`, backgroundColor: "#4488FF" }} />
          </div>
          <span style={styles.value}>{player.mana}/{player.max_mana}</span>
        </div>
      )}

      <div style={styles.row}>
        <span style={styles.label}>Food</span>
        <div style={styles.barBg}>
          <div style={{ ...styles.barFill, width: `${hungerPct}%`, backgroundColor: hungerColor }} />
        </div>
        <span style={styles.value}>{hungerPct > 50 ? "Full" : hungerPct > 25 ? "Hungry" : "Starving"}</span>
      </div>

      <div style={styles.stats}>
        <span>ATK {player.attack}</span>
        <span>DEF {player.defense}</span>
        <span>SPD {player.speed}</span>
        <span style={{ color: "#FFD700" }}>Gold {player.gold}</span>
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
  seed: {
    marginLeft: "auto",
    fontSize: "11px",
    color: "#555",
    cursor: "pointer",
    userSelect: "none" as const,
  },
};
