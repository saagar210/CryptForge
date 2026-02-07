import { useState, useMemo } from "react";
import type { PlayerState } from "../../types/game";

interface CraftPanelProps {
  player: PlayerState;
  onCraft: (weaponIdx: number, scrollIdx: number) => void;
  onClose: () => void;
}

function parseEnchantLevel(name: string): number {
  const match = /\+(\d+)/.exec(name);
  return match?.[1] !== undefined ? parseInt(match[1], 10) : 0;
}

export function CraftPanel({ player, onCraft, onClose }: CraftPanelProps) {
  const [selectedWeapon, setSelectedWeapon] = useState<number | null>(null);
  const [selectedScroll, setSelectedScroll] = useState<number | null>(null);

  const weapons = useMemo(
    () =>
      player.inventory
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.item_type === "Weapon"),
    [player.inventory],
  );

  const scrolls = useMemo(
    () =>
      player.inventory
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.item_type === "Scroll"),
    [player.inventory],
  );

  const enchantLevel =
    selectedWeapon !== null
      ? parseEnchantLevel(player.inventory[selectedWeapon]?.name ?? "")
      : 0;
  const cost = 10 * (enchantLevel + 1);
  const canAfford = player.gold >= cost;
  const canCraft = selectedWeapon !== null && selectedScroll !== null && canAfford;

  const handleEnchant = () => {
    if (selectedWeapon !== null && selectedScroll !== null) {
      onCraft(selectedWeapon, selectedScroll);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.title}>Anvil - Enchant Weapon</span>
          <span style={styles.gold}>Gold: {player.gold}</span>
          <button onClick={onClose} style={styles.closeButton}>
            [Esc] Close
          </button>
        </div>

        <div style={styles.columns}>
          <div style={styles.column}>
            <div style={styles.columnTitle}>Select Weapon</div>
            {weapons.length === 0 && (
              <div style={styles.empty}>No weapons in inventory.</div>
            )}
            {weapons.map(({ item, idx }) => (
              <div
                key={item.id}
                style={{
                  ...styles.itemRow,
                  backgroundColor: selectedWeapon === idx ? "#2a2a4e" : "transparent",
                  border: selectedWeapon === idx ? "1px solid #FFD700" : "1px solid transparent",
                }}
                onClick={() => setSelectedWeapon(idx)}
              >
                <span style={styles.itemName}>{item.name}</span>
                <span style={styles.enchantBadge}>+{parseEnchantLevel(item.name)}</span>
              </div>
            ))}
          </div>

          <div style={styles.divider} />

          <div style={styles.column}>
            <div style={styles.columnTitle}>Select Scroll</div>
            {scrolls.length === 0 && (
              <div style={styles.empty}>No scrolls in inventory.</div>
            )}
            {scrolls.map(({ item, idx }) => (
              <div
                key={item.id}
                style={{
                  ...styles.itemRow,
                  backgroundColor: selectedScroll === idx ? "#2a2a4e" : "transparent",
                  border: selectedScroll === idx ? "1px solid #FFD700" : "1px solid transparent",
                }}
                onClick={() => setSelectedScroll(idx)}
              >
                <span style={styles.itemName}>{item.name}</span>
                {item.charges !== null && (
                  <span style={styles.charges}>{item.charges} charges</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <div style={styles.costLine}>
            <span>Cost: </span>
            <span style={{ color: canAfford ? "#FFD700" : "#FF4444" }}>
              {cost}g
            </span>
            {selectedWeapon !== null && (
              <span style={styles.hint}>
                {" "}(enchant +{enchantLevel} → +{enchantLevel + 1})
              </span>
            )}
          </div>
          <button
            onClick={handleEnchant}
            disabled={!canCraft}
            style={{
              ...styles.enchantButton,
              opacity: canCraft ? 1 : 0.4,
              cursor: canCraft ? "pointer" : "default",
            }}
          >
            Enchant
          </button>
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
    zIndex: 100,
  },
  panel: {
    backgroundColor: "#1a1a2e",
    border: "2px solid #FFD700",
    borderRadius: "4px",
    padding: "16px",
    minWidth: "500px",
    maxWidth: "700px",
    maxHeight: "80vh",
    overflow: "auto",
    fontFamily: "monospace",
    color: "#ddd",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "16px",
    borderBottom: "1px solid #444",
    paddingBottom: "8px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#FFD700",
    flex: 1,
  },
  gold: {
    fontSize: "16px",
    color: "#FFD700",
    fontWeight: "bold",
  },
  closeButton: {
    background: "none",
    border: "1px solid #666",
    color: "#aaa",
    padding: "4px 8px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "12px",
  },
  columns: {
    display: "flex",
    gap: "8px",
  },
  column: {
    flex: 1,
  },
  columnTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#aaa",
    marginBottom: "8px",
    textAlign: "center" as const,
  },
  divider: {
    width: "1px",
    backgroundColor: "#444",
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 8px",
    borderRadius: "2px",
    cursor: "pointer",
    borderBottom: "1px solid #222",
  },
  itemName: {
    flex: 1,
    fontSize: "13px",
  },
  enchantBadge: {
    fontSize: "12px",
    color: "#88AAFF",
    fontWeight: "bold",
  },
  charges: {
    fontSize: "11px",
    color: "#888",
  },
  empty: {
    textAlign: "center" as const,
    color: "#666",
    padding: "16px",
    fontStyle: "italic",
  },
  footer: {
    marginTop: "16px",
    borderTop: "1px solid #444",
    paddingTop: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  costLine: {
    fontSize: "14px",
  },
  hint: {
    fontSize: "12px",
    color: "#888",
  },
  enchantButton: {
    background: "none",
    border: "2px solid #FFD700",
    color: "#FFD700",
    padding: "6px 20px",
    fontFamily: "monospace",
    fontSize: "14px",
    fontWeight: "bold",
  },
};
