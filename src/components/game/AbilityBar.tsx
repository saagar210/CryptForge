import type { AbilityView } from "../../types/game";

interface AbilityBarProps {
  abilities: AbilityView[];
  currentMana: number;
  onUseAbility: (abilityId: string) => void;
}

export function AbilityBar({ abilities, currentMana, onUseAbility }: AbilityBarProps) {
  if (abilities.length === 0) return null;

  return (
    <div style={styles.container}>
      {abilities.map((ability, i) => {
        const canCast = currentMana >= ability.mana_cost;
        return (
          <button
            key={ability.id}
            style={{
              ...styles.btn,
              opacity: canCast ? 1 : 0.4,
              cursor: canCast ? "pointer" : "not-allowed",
            }}
            onClick={() => canCast && onUseAbility(ability.id)}
            title={`${ability.description} (${ability.mana_cost} MP)`}
          >
            <span style={styles.hotkey}>{i + 1}</span>
            <span style={styles.name}>{ability.name}</span>
            <span style={styles.cost}>{ability.mana_cost}mp</span>
          </button>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex", gap: "4px", padding: "4px 8px",
    backgroundColor: "#0a0a18", borderTop: "1px solid #222",
  },
  btn: {
    display: "flex", alignItems: "center", gap: "4px",
    padding: "4px 8px", border: "1px solid #333", borderRadius: "3px",
    backgroundColor: "#111128", color: "#aaa", fontFamily: "monospace",
    fontSize: "11px", transition: "opacity 0.15s",
  },
  hotkey: { color: "#FFD700", fontWeight: "bold" },
  name: { color: "#ccc" },
  cost: { color: "#4488FF", fontSize: "10px" },
};
