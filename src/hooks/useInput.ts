import { useEffect, useCallback, useRef } from "react";
import type { Direction, LevelUpChoice } from "../types/game";

export type InputMode = "normal" | "inventory" | "inspect" | "levelup" | "menu";

interface InputActions {
  onMove: (dir: Direction) => void;
  onWait: () => void;
  onPickUp: () => void;
  onUseStairs: () => void;
  onUseItem: (index: number) => void;
  onDropItem: (index: number) => void;
  onEquipItem: (index: number) => void;
  onUnequipSlot: () => void;
  onLevelUpChoice: (choice: LevelUpChoice) => void;
  onToggleInventory: () => void;
  onToggleInspect: () => void;
  onEscape: () => void;
}

const KEY_TO_DIRECTION: Record<string, Direction> = {
  // Arrow keys
  ArrowUp: "N",
  ArrowDown: "S",
  ArrowRight: "E",
  ArrowLeft: "W",
  // WASD
  w: "N", W: "N",
  s: "S", S: "S",
  d: "E", D: "E",
  a: "W", A: "W",
  // Vi keys
  k: "N", j: "S", l: "E", h: "W",
  y: "NW", u: "NE", b: "SW", n: "SE",
  // WASD diagonals
  q: "NW", Q: "NW",
  e: "NE", E: "NE",
  z: "SW", Z: "SW",
  c: "SE", C: "SE",
  // Numpad
  Numpad8: "N", Numpad2: "S", Numpad6: "E", Numpad4: "W",
  Numpad7: "NW", Numpad9: "NE", Numpad1: "SW", Numpad3: "SE",
};

export function useInput(mode: InputMode, actions: InputActions, enabled: boolean): void {
  const lastKeyTime = useRef(0);
  const DEBOUNCE_MS = 80;

  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const now = Date.now();
      if (now - lastKeyTime.current < DEBOUNCE_MS) return;
      lastKeyTime.current = now;

      const key = event.key;

      // Global keys
      if (key === "Escape") {
        event.preventDefault();
        actions.onEscape();
        return;
      }

      if (mode === "normal") {
        // Movement
        const dir = KEY_TO_DIRECTION[key === " " ? "" : key] ?? KEY_TO_DIRECTION[event.code];
        if (dir) {
          event.preventDefault();
          actions.onMove(dir);
          return;
        }

        // Actions
        if (key === "." || key === "Numpad5" || event.code === "Numpad5") {
          event.preventDefault();
          actions.onWait();
          return;
        }
        if (key === "g" || key === ",") {
          event.preventDefault();
          actions.onPickUp();
          return;
        }
        if (key === ">" || key === "Enter") {
          event.preventDefault();
          actions.onUseStairs();
          return;
        }
        if (key === "i" || key === "I") {
          event.preventDefault();
          actions.onToggleInventory();
          return;
        }
        if (key === "x" || key === "X") {
          event.preventDefault();
          actions.onToggleInspect();
          return;
        }
      }

      if (mode === "inventory") {
        // Number keys 1-9 select items
        const num = parseInt(key);
        if (num >= 1 && num <= 9) {
          event.preventDefault();
          // Use/equip selected item
          actions.onUseItem(num - 1);
          return;
        }
        if (key === "i" || key === "I") {
          event.preventDefault();
          actions.onToggleInventory();
          return;
        }
      }

      if (mode === "levelup") {
        const choices: Record<string, LevelUpChoice> = {
          "1": "MaxHp",
          "2": "Attack",
          "3": "Defense",
          "4": "Speed",
        };
        const choice = choices[key];
        if (choice) {
          event.preventDefault();
          actions.onLevelUpChoice(choice);
          return;
        }
      }
    },
    [mode, actions, enabled],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);
}
