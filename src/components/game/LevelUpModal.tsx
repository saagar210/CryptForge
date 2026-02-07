import type { LevelUpChoice } from "../../types/game";

interface LevelUpModalProps {
  level: number;
  onChoice: (choice: LevelUpChoice) => void;
}

const CHOICES: { key: string; choice: LevelUpChoice; label: string; desc: string }[] = [
  { key: "1", choice: "MaxHp", label: "+10 Max HP", desc: "Increases maximum health by 10 and heals 10" },
  { key: "2", choice: "Attack", label: "+2 Attack", desc: "Increases base attack power by 2" },
  { key: "3", choice: "Defense", label: "+2 Defense", desc: "Increases base defense by 2" },
  { key: "4", choice: "Speed", label: "+15 Speed", desc: "Increases action speed by 15" },
];

export function LevelUpModal({ level, onChoice }: LevelUpModalProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <h2 style={styles.title}>Level Up!</h2>
        <p style={styles.subtitle}>You reached level {level}. Choose an upgrade:</p>
        <div style={styles.choices}>
          {CHOICES.map((c) => (
            <button key={c.key} style={styles.choiceBtn} onClick={() => onChoice(c.choice)}>
              <span style={styles.choiceKey}>[{c.key}]</span>
              <span style={styles.choiceLabel}>{c.label}</span>
              <span style={styles.choiceDesc}>{c.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  panel: {
    backgroundColor: "#111118",
    border: "2px solid #FFD700",
    borderRadius: "8px",
    padding: "24px",
    textAlign: "center" as const,
    fontFamily: "monospace",
    maxWidth: "420px",
  },
  title: {
    margin: "0 0 8px",
    color: "#FFD700",
    fontSize: "22px",
  },
  subtitle: {
    color: "#aaa",
    fontSize: "14px",
    margin: "0 0 16px",
  },
  choices: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  choiceBtn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 16px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #444",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "monospace",
    color: "#ccc",
    textAlign: "left" as const,
    transition: "border-color 0.15s",
  },
  choiceKey: {
    color: "#FFD700",
    fontSize: "14px",
    minWidth: "24px",
  },
  choiceLabel: {
    color: "#44FF44",
    fontSize: "14px",
    fontWeight: "bold",
    minWidth: "100px",
  },
  choiceDesc: {
    color: "#888",
    fontSize: "12px",
  },
};
