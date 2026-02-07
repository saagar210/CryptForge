import { invoke } from "@tauri-apps/api/core";
import type {
  TurnResult,
  GameState,
  PlayerAction,
  PlayerClass,
  EntityDetail,
  RunSummary,
  HighScore,
  Settings,
  OllamaStatus,
  ShopData,
  AchievementStatus,
  UnlockStatus,
  LifetimeStats,
  DailyStatus,
  Direction,
  EquipSlot,
  LevelUpChoice,
  Position,
} from "../types/game";

// --- Game commands ---

export async function newGame(seed?: string, playerClass?: PlayerClass, modifiers?: string[]): Promise<TurnResult> {
  return invoke<TurnResult>("new_game", {
    seed: seed ?? null,
    class: playerClass ?? null,
    modifiers: modifiers ?? null,
  });
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
  return invoke<EntityDetail | null>("inspect_entity", { entity_id: entityId });
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

// --- Shop ---

export async function getAdjacentShop(): Promise<ShopData | null> {
  return invoke<ShopData | null>("get_adjacent_shop");
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

export function clickMoveAction(x: number, y: number): PlayerAction {
  return { action_type: { ClickMove: { x, y } } };
}

export function autoExploreAction(): PlayerAction {
  return { action_type: "AutoExplore" };
}

export function rangedAttackAction(targetId: number): PlayerAction {
  return { action_type: { RangedAttack: { target_id: targetId } } };
}

export function interactAction(): PlayerAction {
  return { action_type: "Interact" };
}

export function buyItemAction(shopId: number, index: number): PlayerAction {
  return { action_type: { BuyItem: { shop_id: shopId, index } } };
}

export function sellItemAction(index: number, shopId: number): PlayerAction {
  return { action_type: { SellItem: { index, shop_id: shopId } } };
}

export async function getAchievements(): Promise<AchievementStatus[]> {
  return invoke<AchievementStatus[]>("get_achievements");
}

// --- Unlockables ---

export async function getUnlockables(): Promise<UnlockStatus[]> {
  return invoke<UnlockStatus[]>("get_unlockables");
}

// --- Statistics ---

export async function getStatistics(): Promise<LifetimeStats> {
  return invoke<LifetimeStats>("get_statistics");
}

// --- Ability action helper ---

export function useAbilityAction(abilityId: string, target?: Position | null): PlayerAction {
  return { action_type: { UseAbility: { ability_id: abilityId, target: target ?? null } } };
}

// --- Craft action helper ---

export function craftAction(weaponIdx: number, scrollIdx: number): PlayerAction {
  return { action_type: { Craft: { weapon_idx: weaponIdx, scroll_idx: scrollIdx } } };
}

// --- Daily Challenge ---

export async function startDailyChallenge(): Promise<TurnResult> {
  return invoke<TurnResult>("start_daily_challenge");
}

export async function getDailyStatus(): Promise<DailyStatus> {
  return invoke<DailyStatus>("get_daily_status");
}
