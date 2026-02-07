// All types mirror Rust serde output from engine/entity.rs

export interface Position {
  x: number;
  y: number;
}

export type Direction = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";

export type EntityType = "Player" | "Enemy" | "Item" | "Door" | "Trap" | "Stairs";

export type ItemType = "Weapon" | "Armor" | "Shield" | "Ring" | "Amulet" | "Potion" | "Scroll" | "Wand" | "Key" | "Food";

export type EquipSlot = "MainHand" | "OffHand" | "Head" | "Body" | "Ring" | "Amulet";

export type StatusType =
  | "Poison"
  | "Burning"
  | "Stunned"
  | "Confused"
  | "Weakened"
  | "Strengthened"
  | "Blinded"
  | "Regenerating"
  | "Hasted"
  | "Slowed"
  | "Shielded"
  | "Invisible";

export type LogSeverity = "Info" | "Warning" | "Danger" | "Good";

export type LevelUpChoice = "MaxHp" | "Attack" | "Defense" | "Speed";

// --- Action types (sent to backend) ---

export type PlayerActionType =
  | { Move: Direction }
  | "Wait"
  | "PickUp"
  | "UseStairs"
  | { UseItem: number }
  | { DropItem: number }
  | { EquipItem: number }
  | { UnequipSlot: EquipSlot }
  | { LevelUpChoice: LevelUpChoice };

export interface PlayerAction {
  action_type: PlayerActionType;
}

// --- State types (received from backend) ---

export interface TurnResult {
  state: GameState;
  events: GameEvent[];
  game_over: GameOverInfo | null;
}

export interface GameState {
  player: PlayerState;
  visible_tiles: VisibleTile[];
  visible_entities: EntityView[];
  floor: number;
  turn: number;
  messages: LogMessage[];
  minimap: MinimapData;
  pending_level_up: boolean;
}

export interface PlayerState {
  position: Position;
  hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  speed: number;
  level: number;
  xp: number;
  xp_to_next: number;
  inventory: ItemView[];
  equipment: EquipmentView;
  status_effects: StatusView[];
}

export interface VisibleTile {
  x: number;
  y: number;
  tile_type: string;
  explored: boolean;
  visible: boolean;
}

export interface EntityView {
  id: number;
  name: string;
  position: Position;
  entity_type: EntityType;
  glyph: number;
  hp: [number, number] | null;
  flavor_text: string | null;
}

export interface ItemView {
  id: number;
  name: string;
  item_type: ItemType;
  slot: EquipSlot | null;
  charges: number | null;
}

export interface EquipmentView {
  main_hand: ItemView | null;
  off_hand: ItemView | null;
  head: ItemView | null;
  body: ItemView | null;
  ring: ItemView | null;
  amulet: ItemView | null;
}

export interface StatusView {
  effect_type: StatusType;
  duration: number;
  magnitude: number;
}

export interface LogMessage {
  text: string;
  turn: number;
  severity: LogSeverity;
}

export interface MinimapData {
  width: number;
  height: number;
  tiles: number[];
  player_x: number;
  player_y: number;
}

// --- Event types ---

export type GameEvent =
  | { Moved: { entity_id: number; from: Position; to: Position } }
  | { Attacked: { attacker_id: number; target_id: number; damage: number; killed: boolean } }
  | { DamageTaken: { entity_id: number; amount: number; source: string } }
  | { Healed: { entity_id: number; amount: number } }
  | { ItemPickedUp: { item: ItemView } }
  | { ItemUsed: { item: ItemView; effect: string } }
  | { ItemDropped: { item: ItemView } }
  | { ItemEquipped: { item: ItemView; slot: EquipSlot } }
  | { StatusApplied: { entity_id: number; effect: StatusType; duration: number } }
  | { StatusExpired: { entity_id: number; effect: StatusType } }
  | { DoorOpened: { position: Position } }
  | { TrapTriggered: { position: Position; trap_type: string; damage: number } }
  | { StairsDescended: { new_floor: number } }
  | { EnemySpotted: { entity_id: number; name: string } }
  | { LevelUp: { new_level: number } }
  | { FlavorText: { text: string } }
  | { PlayerDied: { cause: string } }
  | { BossDefeated: { name: string; floor: number } }
  | "Victory";

// --- Game over ---

export interface GameOverInfo {
  cause_of_death: string;
  epitaph: string | null;
  final_score: number;
  run_summary: RunSummary;
}

export interface RunSummary {
  seed: string;
  floor_reached: number;
  enemies_killed: number;
  bosses_killed: number;
  level_reached: number;
  turns_taken: number;
  score: number;
  cause_of_death: string | null;
  victory: boolean;
  timestamp: string;
}

export interface HighScore {
  rank: number;
  score: number;
  floor_reached: number;
  seed: string;
  timestamp: string;
  victory: boolean;
}

export interface EntityDetail {
  id: number;
  name: string;
  entity_type: EntityType;
  hp: [number, number] | null;
  attack: number | null;
  defense: number | null;
  status_effects: StatusView[];
  flavor_text: string | null;
}

export interface Settings {
  tile_size: number;
  master_volume: number;
  sfx_volume: number;
  ambient_volume: number;
  fullscreen: boolean;
  ollama_enabled: boolean;
  ollama_url: string;
  ollama_model: string;
  ollama_timeout: number;
}

export interface OllamaStatus {
  available: boolean;
  model_loaded: boolean;
  url: string;
}

// --- App-level types ---

export type AppScreen = "menu" | "game" | "death" | "victory" | "highscores" | "history" | "settings";
