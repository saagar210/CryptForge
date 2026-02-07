import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { GameState, Direction, LevelUpChoice, GameOverInfo, GameEvent, Position, ShopData } from "../../types/game";
import type { TargetingState } from "../../lib/renderer";
import { useInput, type InputMode } from "../../hooks/useInput";
import { useAudio } from "../../hooks/useAudio";
import * as api from "../../lib/api";
import { GameCanvas } from "./GameCanvas";
import { HUD } from "./HUD";
import { MessageLog } from "./MessageLog";
import { Minimap } from "./Minimap";
import { InventoryPanel } from "./InventoryPanel";
import { LevelUpModal } from "./LevelUpModal";
import { ShopPanel } from "./ShopPanel";

interface GameViewProps {
  gameState: GameState;
  gameOver: GameOverInfo | null;
  events: GameEvent[];
  pendingLevelUp: boolean;
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  onMove: (dir: Direction) => void;
  onWait: () => void;
  onPickUp: () => void;
  onUseStairs: () => void;
  onUseItem: (index: number) => void;
  onDropItem: (index: number) => void;
  onEquipItem: (index: number) => void;
  onLevelUpChoice: (choice: LevelUpChoice) => void;
  onEscape: () => void;
  onClickMove?: (x: number, y: number) => void;
  onInspectEntity?: (entityId: number) => void;
  onAutoExplore?: () => void;
  onCancelAutoExplore?: () => void;
  onRangedAttack?: (targetId: number) => void;
  onInteract?: () => void;
  onBuyItem?: (shopId: number, index: number) => void;
  onSellItem?: (index: number, shopId: number) => void;
}

export function GameView({
  gameState,
  // gameOver is handled by parent (DeathScreen) — not needed here
  events,
  pendingLevelUp,
  masterVolume,
  sfxVolume,
  ambientVolume,
  onMove,
  onWait,
  onPickUp,
  onUseStairs,
  onUseItem,
  onDropItem,
  onEquipItem,
  onLevelUpChoice,
  onEscape,
  onClickMove,
  onInspectEntity,
  onAutoExplore,
  onCancelAutoExplore,
  onRangedAttack,
  onInteract,
  onBuyItem,
  onSellItem,
}: GameViewProps) {
  const [showInventory, setShowInventory] = useState(false);
  const [targetingMode, setTargetingMode] = useState(false);
  const [targetCursor, setTargetCursor] = useState<Position>({ x: 0, y: 0 });
  const targetCycleIndexRef = useRef(0);
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [toasts, setToasts] = useState<string[]>([]);

  // Achievement toast from events
  useEffect(() => {
    const unlocked = events
      .filter((e): e is { AchievementUnlocked: { name: string } } =>
        typeof e === "object" && "AchievementUnlocked" in e
      )
      .map((e) => e.AchievementUnlocked.name);
    if (unlocked.length > 0) {
      setToasts((prev) => [...prev, ...unlocked]);
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.slice(unlocked.length));
      }, 3000);
    }
  }, [events]);

  // Targeting helpers
  const DIR_DELTA: Record<Direction, Position> = {
    N: { x: 0, y: -1 }, S: { x: 0, y: 1 }, E: { x: 1, y: 0 }, W: { x: -1, y: 0 },
    NE: { x: 1, y: -1 }, NW: { x: -1, y: -1 }, SE: { x: 1, y: 1 }, SW: { x: -1, y: 1 },
  };

  // Max targeting range — backend validates actual weapon range on attack
  const weaponRange = 8;

  const visibleEnemies = useMemo(() =>
    gameState.visible_entities.filter((e) => {
      if (e.entity_type !== "Enemy") return false;
      const dist = Math.max(
        Math.abs(e.position.x - gameState.player.position.x),
        Math.abs(e.position.y - gameState.player.position.y),
      );
      return dist <= weaponRange;
    }), [gameState.visible_entities, gameState.player.position.x, gameState.player.position.y]
  );

  const validTargetIds = useMemo(() => visibleEnemies.map((e) => e.id), [visibleEnemies]);

  // Detect shop bump — check if latest messages contain shop welcome
  useEffect(() => {
    const latest = gameState.messages[0];
    if (latest && latest.text.includes("welcomes you to their shop")) {
      api.getAdjacentShop().then((shop) => {
        if (shop) setShopData(shop);
      }).catch(() => {});
    }
  }, [gameState.messages]);

  const mode: InputMode = pendingLevelUp
    ? "levelup"
    : showInventory
    ? "inventory"
    : targetingMode
    ? "targeting"
    : "normal";

  const inputActions = useMemo(
    () => ({
      onMove: (dir: Direction) => { onCancelAutoExplore?.(); onMove(dir); },
      onWait: () => { onCancelAutoExplore?.(); onWait(); },
      onPickUp,
      onUseStairs,
      onUseItem,
      onDropItem,
      onEquipItem,
      onUnequipSlot: () => {},
      onLevelUpChoice,
      onToggleInventory: () => setShowInventory((v) => !v),
      onToggleInspect: () => {},
      onInteract: () => onInteract?.(),
      onAutoExplore: () => onAutoExplore?.(),
      onEnterTargeting: () => {
        // Start targeting mode with cursor on nearest enemy or player pos
        const firstEnemy = visibleEnemies[0];
        const startPos = firstEnemy?.position ?? gameState.player.position;
        setTargetCursor(startPos);
        targetCycleIndexRef.current = 0;
        setTargetingMode(true);
      },
      onTargetMove: (dir: Direction) => {
        const delta = DIR_DELTA[dir];
        setTargetCursor((prev) => ({ x: prev.x + delta.x, y: prev.y + delta.y }));
      },
      onTargetCycleNext: () => {
        if (visibleEnemies.length === 0) return;
        targetCycleIndexRef.current = (targetCycleIndexRef.current + 1) % visibleEnemies.length;
        const enemy = visibleEnemies[targetCycleIndexRef.current];
        if (enemy) setTargetCursor(enemy.position);
      },
      onTargetConfirm: () => {
        // Find enemy at cursor position
        const target = gameState.visible_entities.find(
          (e) => e.entity_type === "Enemy" && e.position.x === targetCursor.x && e.position.y === targetCursor.y,
        );
        if (target) {
          onRangedAttack?.(target.id);
        }
        setTargetingMode(false);
      },
      onEscape: () => {
        onCancelAutoExplore?.();
        if (shopData) {
          setShopData(null);
        } else if (targetingMode) {
          setTargetingMode(false);
        } else if (showInventory) {
          setShowInventory(false);
        } else {
          onEscape();
        }
      },
    }),
    [onMove, onWait, onPickUp, onUseStairs, onUseItem, onDropItem, onEquipItem, onLevelUpChoice, showInventory, targetingMode, targetCursor, visibleEnemies, gameState.player.position, gameState.visible_entities, onEscape, onInteract, onAutoExplore, onCancelAutoExplore, onRangedAttack, shopData],
  );

  useInput(mode, inputActions, true);
  useAudio(events, masterVolume, sfxVolume, ambientVolume, gameState.biome);

  const handleCloseInventory = useCallback(() => setShowInventory(false), []);

  const handleCanvasClick = useCallback((tileX: number, tileY: number) => {
    if (targetingMode) {
      // In targeting mode, click confirms target at tile
      const target = gameState.visible_entities.find(
        (e) => e.entity_type === "Enemy" && e.position.x === tileX && e.position.y === tileY,
      );
      if (target) {
        onRangedAttack?.(target.id);
      }
      setTargetingMode(false);
      return;
    }
    onClickMove?.(tileX, tileY);
  }, [onClickMove, targetingMode, gameState.visible_entities, onRangedAttack]);

  const handleCanvasRightClick = useCallback((tileX: number, tileY: number) => {
    // Find entity at this tile to inspect
    const entity = gameState.visible_entities.find(
      (e) => e.position.x === tileX && e.position.y === tileY && e.entity_type !== "Player"
    );
    if (entity) {
      onInspectEntity?.(entity.id);
    }
  }, [gameState.visible_entities, onInspectEntity]);

  const handleBuy = useCallback(async (shopId: number, index: number) => {
    await onBuyItem?.(shopId, index);
    // Refresh shop data after purchase
    const updated = await api.getAdjacentShop();
    setShopData(updated);
  }, [onBuyItem]);

  const handleSell = useCallback(async (index: number, shopId: number) => {
    await onSellItem?.(index, shopId);
    // Refresh shop data after sale
    const updated = await api.getAdjacentShop();
    setShopData(updated);
  }, [onSellItem]);

  const handleCloseShop = useCallback(() => setShopData(null), []);

  const currentTargeting: TargetingState | null = targetingMode
    ? {
        cursor: targetCursor,
        playerPos: gameState.player.position,
        range: weaponRange,
        validTargetIds,
      }
    : null;

  return (
    <div style={styles.container}>
      <HUD player={gameState.player} floor={gameState.floor} turn={gameState.turn} seed={gameState.seed} />

      <div style={styles.main}>
        <div style={styles.canvasArea}>
          <GameCanvas
            gameState={gameState}
            events={events}
            onCanvasClick={handleCanvasClick}
            onCanvasRightClick={handleCanvasRightClick}
            targeting={currentTargeting}
          />
        </div>
        <div style={styles.sidebar}>
          <Minimap data={gameState.minimap} />
          <div style={styles.keyHints}>
            <div>WASD/Arrows: Move</div>
            <div>.: Wait | g: Pick up</div>
            <div>&gt;: Stairs | i: Inventory</div>
            <div>o: Auto-explore | f: Target</div>
            <div>e: Interact | Esc: Menu</div>
          </div>
        </div>
      </div>

      <MessageLog messages={gameState.messages} />

      {showInventory && (
        <InventoryPanel
          player={gameState.player}
          onUseItem={(i) => { onUseItem(i); setShowInventory(false); }}
          onDropItem={(i) => { onDropItem(i); setShowInventory(false); }}
          onEquipItem={(i) => { onEquipItem(i); setShowInventory(false); }}
          onClose={handleCloseInventory}
        />
      )}

      {pendingLevelUp && (
        <LevelUpModal level={gameState.player.level} onChoice={onLevelUpChoice} />
      )}

      {shopData && (
        <ShopPanel
          shop={shopData}
          player={gameState.player}
          onBuy={handleBuy}
          onSell={handleSell}
          onClose={handleCloseShop}
        />
      )}

      {toasts.length > 0 && (
        <div style={styles.toastContainer}>
          {toasts.map((name, i) => (
            <div key={`${name}-${i}`} style={styles.toast}>
              Achievement Unlocked: {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#000",
    position: "relative",
  },
  main: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  canvasArea: {
    flex: 1,
    position: "relative",
  },
  sidebar: {
    width: "180px",
    backgroundColor: "#0a0a12",
    borderLeft: "1px solid #333",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "8px",
  },
  keyHints: {
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#555",
    lineHeight: "1.6",
    marginTop: "auto",
  },
  toastContainer: {
    position: "absolute" as const,
    top: "80px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    zIndex: 100,
    pointerEvents: "none" as const,
  },
  toast: {
    backgroundColor: "rgba(192, 160, 96, 0.9)",
    color: "#000",
    padding: "8px 16px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "14px",
    fontWeight: "bold",
    textAlign: "center" as const,
    whiteSpace: "nowrap" as const,
  },
};
