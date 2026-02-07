import type { LevelUpChoice } from "../../types/game";

interface LevelUpModalProps {
  level: number;
  choices: LevelUpChoice[];
  onChoice: (choice: LevelUpChoice) => void;
}

const CHOICE_INFO: Record<string, { label: string; desc: string; color?: string }> = {
  MaxHp: { label: "+10 Max HP", desc: "Increases maximum health by 10 and heals 10" },
  Attack: { label: "+2 Attack", desc: "Increases base attack power by 2" },
  Defense: { label: "+2 Defense", desc: "Increases base defense by 2" },
  Speed: { label: "+15 Speed", desc: "Increases action speed by 15" },
  Cleave: { label: "Cleave", desc: "Attacks hit harder (+2 bonus damage)", color: "#FF4444" },
  Fortify: { label: "Fortify", desc: "Hardens your defenses (+3 defense)", color: "#FF4444" },
  Backstab: { label: "Backstab", desc: "Strike weak points (+5% critical chance)", color: "#44FF44" },
  Evasion: { label: "Evasion", desc: "Dodge incoming attacks (+5% dodge chance)", color: "#44FF44" },
  SpellPower: { label: "Spell Power", desc: "Increases spell damage (+3 spell power)", color: "#4488FF" },
  ManaRegen: { label: "Mana Regen", desc: "Faster mana recovery (+1 per turn)", color: "#4488FF" },
};

export function LevelUpModal({ level, choices, onChoice }: LevelUpModalProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <h2 style={styles.title}>Level Up!</h2>
        <p style={styles.subtitle}>You reached level {level}. Choose an upgrade:</p>
        <div style={styles.choices}>
          {choices.map((choice, i) => {
            const info = CHOICE_INFO[choice] ?? { label: choice, desc: "" };
            return (
              <button key={choice} style={styles.choiceBtn} onClick={() => onChoice(choice)}>
                <span style={styles.choiceKey}>[{i + 1}]</span>
                <span style={{ ...styles.choiceLabel, color: info.color ?? "#44FF44" }}>{info.label}</span>
                <span style={styles.choiceDesc}>{info.desc}</span>
              </button>
            );
          })}
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
