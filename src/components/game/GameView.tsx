import { useState, useCallback, useMemo } from "react";
import type { GameState, Direction, LevelUpChoice, GameOverInfo, GameEvent } from "../../types/game";
import { useInput, type InputMode } from "../../hooks/useInput";
import { useAudio } from "../../hooks/useAudio";
import { GameCanvas } from "./GameCanvas";
import { HUD } from "./HUD";
import { MessageLog } from "./MessageLog";
import { Minimap } from "./Minimap";
import { InventoryPanel } from "./InventoryPanel";
import { LevelUpModal } from "./LevelUpModal";

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
}

export function GameView({
  gameState,
  gameOver: _gameOver,
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
}: GameViewProps) {
  const [showInventory, setShowInventory] = useState(false);

  const mode: InputMode = pendingLevelUp
    ? "levelup"
    : showInventory
    ? "inventory"
    : "normal";

  const inputActions = useMemo(
    () => ({
      onMove,
      onWait,
      onPickUp,
      onUseStairs,
      onUseItem,
      onDropItem,
      onEquipItem,
      onUnequipSlot: () => {},
      onLevelUpChoice,
      onToggleInventory: () => setShowInventory((v) => !v),
      onToggleInspect: () => {},
      onEscape: () => {
        if (showInventory) {
          setShowInventory(false);
        } else {
          onEscape();
        }
      },
    }),
    [onMove, onWait, onPickUp, onUseStairs, onUseItem, onDropItem, onEquipItem, onLevelUpChoice, showInventory, onEscape],
  );

  useInput(mode, inputActions, true);
  useAudio(events, masterVolume, sfxVolume, ambientVolume);

  const handleCloseInventory = useCallback(() => setShowInventory(false), []);

  return (
    <div style={styles.container}>
      <HUD player={gameState.player} floor={gameState.floor} turn={gameState.turn} />

      <div style={styles.main}>
        <div style={styles.canvasArea}>
          <GameCanvas gameState={gameState} events={events} />
        </div>
        <div style={styles.sidebar}>
          <Minimap data={gameState.minimap} />
          <div style={styles.keyHints}>
            <div>WASD/Arrows: Move</div>
            <div>.: Wait | g: Pick up</div>
            <div>&gt;: Stairs | i: Inventory</div>
            <div>Esc: Menu</div>
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
};
