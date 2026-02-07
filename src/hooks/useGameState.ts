import { useState, useCallback } from "react";
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
    saveGame,
  };
}
