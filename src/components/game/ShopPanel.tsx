import { useCallback } from "react";
import type { ShopData, PlayerState } from "../../types/game";

interface ShopPanelProps {
  shop: ShopData;
  player: PlayerState;
  onBuy: (shopId: number, index: number) => void;
  onSell: (index: number, shopId: number) => void;
  onClose: () => void;
}

export function ShopPanel({ shop, player, onBuy, onSell, onClose }: ShopPanelProps) {
  const handleBuy = useCallback(
    (index: number) => onBuy(shop.shop_id, index),
    [onBuy, shop.shop_id],
  );

  const handleSell = useCallback(
    (index: number) => onSell(index, shop.shop_id),
    [onSell, shop.shop_id],
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.title}>{shop.name}&apos;s Shop</span>
          <span style={styles.gold}>Gold: {player.gold}</span>
          <button onClick={onClose} style={styles.closeButton}>
            [Esc] Close
          </button>
        </div>

        <div style={styles.columns}>
          <div style={styles.column}>
            <div style={styles.columnTitle}>For Sale</div>
            {shop.items.length === 0 && (
              <div style={styles.empty}>Sold out!</div>
            )}
            {shop.items.map((item, i) => (
              <div key={i} style={styles.itemRow}>
                <span style={styles.itemName}>{item.name}</span>
                <span style={styles.itemType}>{item.item_type}</span>
                <span style={styles.price}>{item.price}g</span>
                <button
                  onClick={() => handleBuy(i)}
                  disabled={player.gold < item.price}
                  style={{
                    ...styles.actionButton,
                    opacity: player.gold < item.price ? 0.4 : 1,
                  }}
                >
                  Buy
                </button>
              </div>
            ))}
          </div>

          <div style={styles.divider} />

          <div style={styles.column}>
            <div style={styles.columnTitle}>Your Items</div>
            {player.inventory.length === 0 && (
              <div style={styles.empty}>No items to sell.</div>
            )}
            {player.inventory.map((item, i) => (
              <div key={item.id} style={styles.itemRow}>
                <span style={styles.itemName}>{item.name}</span>
                <span style={styles.itemType}>{item.item_type}</span>
                <button onClick={() => handleSell(i)} style={styles.actionButton}>
                  Sell
                </button>
              </div>
            ))}
          </div>
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
    minWidth: "600px",
    maxWidth: "800px",
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
    padding: "4px 8px",
    borderBottom: "1px solid #222",
  },
  itemName: {
    flex: 1,
    fontSize: "13px",
  },
  itemType: {
    fontSize: "11px",
    color: "#888",
    width: "60px",
  },
  price: {
    fontSize: "13px",
    color: "#FFD700",
    width: "40px",
    textAlign: "right" as const,
  },
  actionButton: {
    background: "none",
    border: "1px solid #666",
    color: "#44FF44",
    padding: "2px 8px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "12px",
  },
  empty: {
    textAlign: "center" as const,
    color: "#666",
    padding: "16px",
    fontStyle: "italic",
  },
};
