import { useState, useCallback, useRef } from "react";
import type {
  TurnResult,
  GameState,
  GameOverInfo,
  GameEvent,
  Direction,
  LevelUpChoice,
  EquipSlot,
  PlayerAction,
} from "../types/game";
import * as api from "../lib/api";

interface UseGameStateReturn {
  gameState: GameState | null;
  gameOver: GameOverInfo | null;
  events: GameEvent[];
  loading: boolean;
  startNewGame: (seed?: string) => Promise<void>;
  continueGame: () => Promise<boolean>;
  move: (dir: Direction) => Promise<void>;
  wait: () => Promise<void>;
  pickUp: () => Promise<void>;
  useStairs: () => Promise<void>;
  useItem: (index: number) => Promise<void>;
  dropItem: (index: number) => Promise<void>;
  equipItem: (index: number) => Promise<void>;
  unequipSlot: (slot: EquipSlot) => Promise<void>;
  levelUpChoice: (choice: LevelUpChoice) => Promise<void>;
  interact: () => Promise<void>;
  clickMove: (x: number, y: number) => Promise<void>;
  rangedAttack: (targetId: number) => Promise<void>;
  buyItem: (shopId: number, index: number) => Promise<void>;
  sellItem: (index: number, shopId: number) => Promise<void>;
  startAutoExplore: () => Promise<void>;
  cancelAutoExplore: () => void;
  saveGame: () => Promise<void>;
}

export function useGameState(): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOver, setGameOver] = useState<GameOverInfo | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const handleResult = useCallback((result: TurnResult) => {
    setGameState(result.state);
    setEvents(result.events);
    setGameOver(result.game_over);
  }, []);

  const startNewGame = useCallback(async (seed?: string) => {
    setLoading(true);
    try {
      const result = await api.newGame(seed);
      handleResult(result);
    } finally {
      setLoading(false);
    }
  }, [handleResult]);

  const continueGame = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const result = await api.loadGame();
      if (result) {
        handleResult(result);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [handleResult]);

  const doAction = useCallback(async (action: PlayerAction) => {
    try {
      const result = await api.playerAction(action);
      handleResult(result);
    } catch (err) {
      console.error("Action failed:", err);
    }
  }, [handleResult]);

  const move = useCallback((dir: Direction) => doAction(api.moveAction(dir)), [doAction]);
  const wait = useCallback(() => doAction(api.waitAction()), [doAction]);
  const pickUp = useCallback(() => doAction(api.pickUpAction()), [doAction]);
  const useStairs = useCallback(() => doAction(api.useStairsAction()), [doAction]);
  const useItem = useCallback((index: number) => doAction(api.useItemAction(index)), [doAction]);
  const dropItem = useCallback((index: number) => doAction(api.dropItemAction(index)), [doAction]);
  const equipItem = useCallback((index: number) => doAction(api.equipItemAction(index)), [doAction]);
  const unequipSlot = useCallback((slot: EquipSlot) => doAction(api.unequipSlotAction(slot)), [doAction]);
  const levelUpChoice = useCallback((choice: LevelUpChoice) => doAction(api.levelUpAction(choice)), [doAction]);
  const interact = useCallback(() => doAction(api.interactAction()), [doAction]);
  const clickMove = useCallback((x: number, y: number) => doAction(api.clickMoveAction(x, y)), [doAction]);
  const rangedAttack = useCallback((targetId: number) => doAction(api.rangedAttackAction(targetId)), [doAction]);
  const buyItem = useCallback((shopId: number, index: number) => doAction(api.buyItemAction(shopId, index)), [doAction]);
  const sellItem = useCallback((index: number, shopId: number) => doAction(api.sellItemAction(index, shopId)), [doAction]);

  const autoExploreRef = useRef(false);

  const cancelAutoExplore = useCallback(() => {
    autoExploreRef.current = false;
  }, []);

  const startAutoExplore = useCallback(async () => {
    autoExploreRef.current = true;
    const loop = async () => {
      if (!autoExploreRef.current) return;
      try {
        const result = await api.playerAction(api.autoExploreAction());
        handleResult(result);
        if (result.auto_explore_interrupt) {
          autoExploreRef.current = false;
          return;
        }
        if (result.game_over) {
          autoExploreRef.current = false;
          return;
        }
        if (autoExploreRef.current) {
          setTimeout(loop, 80);
        }
      } catch {
        autoExploreRef.current = false;
      }
    };
    loop();
  }, [handleResult]);

  const saveGame = useCallback(async () => {
    try {
      await api.saveGame();
    } catch (err) {
      console.error("Save failed:", err);
    }
  }, []);

  return {
    gameState,
    gameOver,
    events,
    loading,
    startNewGame,
    continueGame,
    move,
    wait,
    pickUp,
    useStairs,
    useItem,
    dropItem,
    equipItem,
    unequipSlot,
    levelUpChoice,
    interact,
    clickMove,
    rangedAttack,
    buyItem,
    sellItem,
    startAutoExplore,
    cancelAutoExplore,
    saveGame,
  };
}
