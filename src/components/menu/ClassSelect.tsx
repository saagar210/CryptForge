import { useState } from "react";
import type { PlayerClass } from "../../types/game";

interface ClassSelectProps {
  onSelectClass: (playerClass: PlayerClass, modifiers: string[]) => void;
  onBack: () => void;
}

interface ClassInfo {
  name: PlayerClass;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  crit: string;
  dodge: string;
  mana: number;
  perks: string[];
  color: string;
}

const CLASSES: ClassInfo[] = [
  {
    name: "Warrior",
    hp: 60, atk: 7, def: 4, spd: 90, crit: "5%", dodge: "0%", mana: 30,
    perks: ["High HP and Defense", "Shield Bash, War Cry, Whirlwind", "Cleave & Fortify upgrades"],
    color: "#FF4444",
  },
  {
    name: "Rogue",
    hp: 40, atk: 5, def: 2, spd: 120, crit: "15%", dodge: "10%", mana: 25,
    perks: ["Fast with high crit chance", "Smoke Bomb, Dash, Poison Strike", "Backstab & Evasion upgrades"],
    color: "#44FF44",
  },
  {
    name: "Mage",
    hp: 35, atk: 3, def: 1, spd: 100, crit: "5%", dodge: "0%", mana: 50,
    perks: ["Large mana pool", "Fireball, Frost Bolt, Blink, Arcane Shield", "SpellPower & ManaRegen upgrades"],
    color: "#4488FF",
  },
];

const MODIFIERS = [
  { id: "GlassCannon", name: "Glass Cannon", desc: "2x damage dealt and taken (1.5x score)", color: "#FF6600" },
  { id: "Marathon", name: "Marathon", desc: "20 floors instead of 10 (2x score)", color: "#8888FF" },
  { id: "Pacifist", name: "Pacifist", desc: "No XP from kills, XP from exploration (2.5x score)", color: "#44FFFF" },
  { id: "Cursed", name: "Cursed", desc: "Items unidentified until used (1.3x score)", color: "#AA44FF" },
];

export function ClassSelect({ onSelectClass, onBack }: ClassSelectProps) {
  const [selected, setSelected] = useState<PlayerClass>("Warrior");
  const [activeModifiers, setActiveModifiers] = useState<Set<string>>(new Set());

  const toggleModifier = (id: string) => {
    setActiveModifiers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Choose Your Class</h1>

      <div style={styles.classRow}>
        {CLASSES.map(cls => (
          <div
            key={cls.name}
            style={{
              ...styles.classCard,
              borderColor: selected === cls.name ? cls.color : "#333",
              backgroundColor: selected === cls.name ? "#1a1a2e" : "#111118",
            }}
            onClick={() => setSelected(cls.name)}
          >
            <h2 style={{ ...styles.className, color: cls.color }}>{cls.name}</h2>
            <div style={styles.statGrid}>
              <span>HP {cls.hp}</span>
              <span>ATK {cls.atk}</span>
              <span>DEF {cls.def}</span>
              <span>SPD {cls.spd}</span>
              <span>Crit {cls.crit}</span>
              <span>Dodge {cls.dodge}</span>
              <span>Mana {cls.mana}</span>
            </div>
            <div style={styles.perks}>
              {cls.perks.map((p, i) => (
                <div key={i} style={styles.perk}>{p}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 style={styles.subtitle}>Run Modifiers (Optional)</h2>
      <div style={styles.modRow}>
        {MODIFIERS.map(mod => (
          <div
            key={mod.id}
            style={{
              ...styles.modCard,
              borderColor: activeModifiers.has(mod.id) ? mod.color : "#333",
              opacity: activeModifiers.has(mod.id) ? 1 : 0.6,
            }}
            onClick={() => toggleModifier(mod.id)}
          >
            <span style={{ color: mod.color, fontWeight: "bold" }}>{mod.name}</span>
            <span style={styles.modDesc}>{mod.desc}</span>
          </div>
        ))}
      </div>

      <div style={styles.buttons}>
        <button style={styles.btn} onClick={onBack}>Back</button>
        <button
          style={{ ...styles.btn, ...styles.startBtn }}
          onClick={() => onSelectClass(selected, Array.from(activeModifiers))}
        >
          Start as {selected}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "32px", backgroundColor: "#0a0a12", minHeight: "100vh",
    fontFamily: "monospace", color: "#ccc",
  },
  title: { fontSize: "28px", color: "#FFD700", marginBottom: "24px" },
  subtitle: { fontSize: "18px", color: "#888", marginTop: "24px", marginBottom: "12px" },
  classRow: { display: "flex", gap: "16px" },
  classCard: {
    border: "2px solid #333", borderRadius: "8px", padding: "16px",
    width: "220px", cursor: "pointer", transition: "border-color 0.15s",
  },
  className: { margin: "0 0 8px 0", fontSize: "20px" },
  statGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px",
    fontSize: "12px", color: "#aaa", marginBottom: "8px",
  },
  perks: { fontSize: "11px", color: "#888" },
  perk: { marginBottom: "4px" },
  modRow: { display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" },
  modCard: {
    border: "1px solid #333", borderRadius: "6px", padding: "8px 12px",
    cursor: "pointer", display: "flex", flexDirection: "column", gap: "2px",
    fontSize: "12px", transition: "opacity 0.15s",
  },
  modDesc: { color: "#666", fontSize: "10px" },
  buttons: { display: "flex", gap: "16px", marginTop: "32px" },
  btn: {
    padding: "10px 24px", border: "1px solid #444", borderRadius: "4px",
    backgroundColor: "#1a1a2e", color: "#ccc", cursor: "pointer",
    fontFamily: "monospace", fontSize: "14px",
  },
  startBtn: { backgroundColor: "#2a2a4e", borderColor: "#FFD700", color: "#FFD700" },
};
