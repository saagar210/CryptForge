import { invoke } from "@tauri-apps/api/core";
import type {
  TurnResult,
  GameState,
  PlayerAction,
  EntityDetail,
  RunSummary,
  HighScore,
  Settings,
  OllamaStatus,
  Direction,
  EquipSlot,
  LevelUpChoice,
} from "../types/game";

// --- Game commands ---

export async function newGame(seed?: string): Promise<TurnResult> {
  return invoke<TurnResult>("new_game", { seed: seed ?? null });
}

export async function playerAction(action: PlayerAction): Promise<TurnResult> {
  return invoke<TurnResult>("player_action", { action });
}

export async function getGameState(): Promise<GameState | null> {
  return invoke<GameState | null>("get_game_state");
}

export async function saveGame(): Promise<void> {
  return invoke<void>("save_game");
}

export async function loadGame(): Promise<TurnResult | null> {
  return invoke<TurnResult | null>("load_game");
}

export async function inspectEntity(entityId: number): Promise<EntityDetail | null> {
  return invoke<EntityDetail | null>("inspect_entity", { entityId });
}

// --- History & Scores ---

export async function getRunHistory(): Promise<RunSummary[]> {
  return invoke<RunSummary[]>("get_run_history");
}

export async function getHighScores(): Promise<HighScore[]> {
  return invoke<HighScore[]>("get_high_scores");
}

// --- Settings ---

export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

export async function updateSettings(settings: Settings): Promise<void> {
  return invoke<void>("update_settings", { settings });
}

// --- Save check ---

export async function hasSaveGame(): Promise<boolean> {
  return invoke<boolean>("has_save_game");
}

// --- Ollama ---

export async function checkOllama(): Promise<OllamaStatus> {
  return invoke<OllamaStatus>("check_ollama");
}

// --- Action helpers ---

export function moveAction(dir: Direction): PlayerAction {
  return { action_type: { Move: dir } };
}

export function waitAction(): PlayerAction {
  return { action_type: "Wait" };
}

export function pickUpAction(): PlayerAction {
  return { action_type: "PickUp" };
}

export function useStairsAction(): PlayerAction {
  return { action_type: "UseStairs" };
}

export function useItemAction(index: number): PlayerAction {
  return { action_type: { UseItem: index } };
}

export function dropItemAction(index: number): PlayerAction {
  return { action_type: { DropItem: index } };
}

export function equipItemAction(index: number): PlayerAction {
  return { action_type: { EquipItem: index } };
}

export function unequipSlotAction(slot: EquipSlot): PlayerAction {
  return { action_type: { UnequipSlot: slot } };
}

export function levelUpAction(choice: LevelUpChoice): PlayerAction {
  return { action_type: { LevelUpChoice: choice } };
}
