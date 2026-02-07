import type { PlayerState, ItemView, EquipmentView } from "../../types/game";

interface InventoryPanelProps {
  player: PlayerState;
  onUseItem: (index: number) => void;
  onDropItem: (index: number) => void;
  onEquipItem: (index: number) => void;
  onClose: () => void;
}

export function InventoryPanel({ player, onUseItem, onDropItem, onEquipItem, onClose }: InventoryPanelProps) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Inventory ({player.inventory.length}/20)</h3>
          <button style={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        <EquipmentDisplay equipment={player.equipment} />

        <div style={styles.divider} />

        {player.inventory.length === 0 ? (
          <div style={styles.empty}>Your inventory is empty.</div>
        ) : (
          <div style={styles.itemList}>
            {player.inventory.map((item, i) => (
              <ItemRow key={item.id} item={item} index={i} onUse={onUseItem} onDrop={onDropItem} onEquip={onEquipItem} />
            ))}
          </div>
        )}

        <div style={styles.help}>
          [1-9] Use item | [I] Close
        </div>
      </div>
    </div>
  );
}

function ItemRow({ item, index, onUse, onDrop, onEquip }: {
  item: ItemView;
  index: number;
  onUse: (i: number) => void;
  onDrop: (i: number) => void;
  onEquip: (i: number) => void;
}) {
  const isEquippable = item.slot !== null;
  const isUsable = ["Potion", "Scroll", "Food", "Wand"].includes(item.item_type);

  return (
    <div style={styles.itemRow}>
      <span style={styles.itemIndex}>{index + 1}.</span>
      <span style={styles.itemName}>{item.name}</span>
      {item.charges !== null && <span style={styles.charges}>({item.charges})</span>}
      <div style={styles.itemActions}>
        {isUsable && <button style={styles.actionBtn} onClick={() => onUse(index)}>Use</button>}
        {isEquippable && <button style={styles.actionBtn} onClick={() => onEquip(index)}>Equip</button>}
        <button style={styles.actionBtn} onClick={() => onDrop(index)}>Drop</button>
      </div>
    </div>
  );
}

function EquipmentDisplay({ equipment }: { equipment: EquipmentView }) {
  const slots: [string, ItemView | null][] = [
    ["Main Hand", equipment.main_hand],
    ["Off Hand", equipment.off_hand],
    ["Head", equipment.head],
    ["Body", equipment.body],
    ["Ring", equipment.ring],
    ["Amulet", equipment.amulet],
  ];

  return (
    <div style={styles.equipment}>
      <div style={styles.sectionTitle}>Equipment</div>
      {slots.map(([name, item]) => (
        <div key={name} style={styles.equipSlot}>
          <span style={styles.slotName}>{name}:</span>
          <span style={styles.slotItem}>{item ? item.name : "—"}</span>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  panel: {
    backgroundColor: "#111118",
    border: "1px solid #444",
    borderRadius: "4px",
    padding: "16px",
    minWidth: "400px",
    maxWidth: "500px",
    maxHeight: "80vh",
    overflowY: "auto",
    fontFamily: "monospace",
    color: "#ccc",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  title: {
    margin: 0,
    fontSize: "16px",
    color: "#FFD700",
  },
  closeBtn: {
    background: "none",
    border: "1px solid #666",
    color: "#ccc",
    cursor: "pointer",
    padding: "2px 8px",
    fontFamily: "monospace",
  },
  equipment: {
    marginBottom: "8px",
  },
  sectionTitle: {
    fontSize: "13px",
    color: "#888",
    marginBottom: "4px",
  },
  equipSlot: {
    display: "flex",
    gap: "8px",
    fontSize: "12px",
    padding: "1px 0",
  },
  slotName: {
    color: "#666",
    minWidth: "80px",
  },
  slotItem: {
    color: "#aaa",
  },
  divider: {
    borderTop: "1px solid #333",
    margin: "8px 0",
  },
  empty: {
    color: "#666",
    textAlign: "center" as const,
    padding: "16px 0",
  },
  itemList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px",
    fontSize: "13px",
    borderRadius: "2px",
  },
  itemIndex: {
    color: "#666",
    minWidth: "20px",
  },
  itemName: {
    flex: 1,
    color: "#ccc",
  },
  charges: {
    color: "#888",
    fontSize: "11px",
  },
  itemActions: {
    display: "flex",
    gap: "4px",
  },
  actionBtn: {
    background: "none",
    border: "1px solid #555",
    color: "#aaa",
    cursor: "pointer",
    padding: "1px 6px",
    fontSize: "11px",
    fontFamily: "monospace",
    borderRadius: "2px",
  },
  help: {
    marginTop: "8px",
    textAlign: "center" as const,
    fontSize: "11px",
    color: "#555",
  },
};
