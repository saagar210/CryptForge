# CryptForge — Technical Design Specification

A turn-based roguelike dungeon crawler with procedurally generated dungeons, permadeath, and local LLM-generated flavor text. Built with Tauri 2, React 19, TypeScript, Rust, SQLite, and Ollama.

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Directory Structure](#2-directory-structure)
3. [Tauri IPC Contract](#3-tauri-ipc-contract)
4. [Game State Machine](#4-game-state-machine)
5. [Entity & Component Model](#5-entity--component-model)
6. [Map & Dungeon Generation](#6-map--dungeon-generation)
7. [Field of View](#7-field-of-view)
8. [Turn System](#8-turn-system)
9. [Pathfinding & Enemy AI](#9-pathfinding--enemy-ai)
10. [Combat System](#10-combat-system)
11. [Status Effects](#11-status-effects)
12. [Equipment & Inventory](#12-equipment--inventory)
13. [Item Design](#13-item-design)
14. [Enemy Design](#14-enemy-design)
15. [Floor Progression & Difficulty](#15-floor-progression--difficulty)
16. [Leveling & Scoring](#16-leveling--scoring)
17. [Ollama Flavor Engine](#17-ollama-flavor-engine)
18. [Frontend Architecture](#18-frontend-architecture)
19. [Input System](#19-input-system)
20. [Audio](#20-audio)
21. [Persistence — SQLite](#21-persistence--sqlite)
22. [Asset Strategy](#22-asset-strategy)
23. [Testing Strategy](#23-testing-strategy)

---

## 1. Architecture

### Core Principle

**All game logic lives in Rust.** The React frontend is a dumb renderer — it sends player actions over Tauri IPC and draws whatever state it receives back. It never computes damage, moves entities, checks line of sight, or makes any gameplay decision.

Ollama is an **async flavor layer**. The game is fully playable without it. The LLM generates item names, enemy lore, and room descriptions in the background. If Ollama is unavailable or slow, pre-written fallback templates are used. The player never waits on the LLM.

### Layer Responsibilities

| Layer | Tech | Owns |
|-------|------|------|
| Game Engine | Rust | Dungeon gen, turn resolution, combat, AI, FOV, pathfinding, entity management, all game rules |
| Renderer | React 19 + Canvas | Tile drawing, animations, HUD, menus, input capture |
| Flavor Engine | Ollama (optional) | Item names, enemy lore, room descriptions, death epitaphs |
| Persistence | SQLite (rusqlite) | Active save, run history, high scores, settings |
| Audio | Web Audio API | Sound effects, ambient loops |

### Data Flow

```
Keypress → React Input Handler
  → invoke("player_action", { action }) → Rust
    → Validate action
    → Resolve player action (move/attack/use/etc.)
    → Tick all enemy turns (energy system)
    → Tick status effects
    → Recalculate FOV
    → Check win/death conditions
    → Build TurnResult (visible state + events)
  → TurnResult returned to React
    → Update canvas (animate events)
    → Update HUD (HP, stats)
    → Append to message log
    → Play sound effects for events

[Async, background]
Ollama generates flavor text → Rust caches it → emit event → React updates entity tooltips
```

---

## 2. Directory Structure

```
cryptforge/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   └── src/
│       ├── main.rs                  # Tauri bootstrap
│       ├── lib.rs                   # Module declarations, Tauri setup
│       ├── commands.rs              # All #[tauri::command] handlers
│       ├── engine/
│       │   ├── mod.rs
│       │   ├── state.rs             # GameState, World, turn resolution
│       │   ├── entity.rs            # Entity struct, component types
│       │   ├── map.rs               # Map struct, tile types
│       │   ├── dungeon/
│       │   │   ├── mod.rs
│       │   │   ├── bsp.rs           # BSP tree generation
│       │   │   ├── cellular.rs      # Cellular automata generation
│       │   │   ├── corridor.rs      # Corridor carving
│       │   │   ├── placement.rs     # Entity/item/enemy spawning
│       │   │   └── room.rs          # Room types, special rooms
│       │   ├── fov.rs               # Symmetric shadowcasting
│       │   ├── pathfinding.rs       # Dijkstra maps, A*
│       │   ├── combat.rs            # Damage calculation, attack resolution
│       │   ├── ai.rs                # Enemy behavior logic
│       │   ├── effects.rs           # Status effect definitions and ticking
│       │   ├── inventory.rs         # Inventory management, equip/unequip
│       │   ├── items.rs             # Item definitions, loot tables
│       │   ├── enemies.rs           # Enemy definitions, bestiary
│       │   └── level.rs             # Level-up logic, XP calculation
│       ├── flavor/
│       │   ├── mod.rs
│       │   ├── ollama.rs            # Ollama HTTP client
│       │   ├── templates.rs         # Fallback text templates
│       │   ├── prompts.rs           # LLM prompt construction
│       │   └── cache.rs             # Generated text cache
│       └── persistence/
│           ├── mod.rs
│           ├── database.rs          # SQLite schema, migrations, queries
│           ├── save.rs              # Save/load active game state
│           └── config.rs            # User settings read/write
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # Root component, state machine router
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameView.tsx         # Main game screen container
│   │   │   ├── GameCanvas.tsx       # Canvas renderer (tiles, entities, FOV)
│   │   │   ├── Minimap.tsx          # Minimap overlay
│   │   │   ├── HUD.tsx              # HP bar, stats, floor indicator
│   │   │   ├── MessageLog.tsx       # Scrollable event log
│   │   │   ├── InventoryPanel.tsx   # Inventory + equipment display
│   │   │   ├── InspectPanel.tsx     # Entity inspection tooltip
│   │   │   ├── LevelUpModal.tsx     # Level-up choice screen
│   │   │   └── DeathScreen.tsx      # Game over + run summary
│   │   └── menu/
│   │       ├── MainMenu.tsx         # Title screen
│   │       ├── HighScores.tsx       # Leaderboard
│   │       ├── RunHistory.tsx       # Past run details
│   │       └── Settings.tsx         # Configuration screen
│   ├── hooks/
│   │   ├── useGameState.ts          # Game state management + Tauri IPC
│   │   ├── useInput.ts              # Keyboard input handling
│   │   └── useAudio.ts              # Sound effect playback
│   ├── lib/
│   │   ├── api.ts                   # Typed Tauri invoke wrappers
│   │   ├── renderer.ts              # Canvas drawing logic
│   │   ├── tiles.ts                 # Tileset loading, sprite lookup
│   │   └── audio.ts                 # Audio file loading, playback engine
│   ├── types/
│   │   └── game.ts                  # TypeScript interfaces mirroring Rust types
│   └── assets/
│       ├── tilesets/                # Sprite sheets
│       ├── sounds/                  # .ogg sound effects
│       └── fonts/                   # Game fonts
├── docs/
│   └── DESIGN.md                    # This file
├── CLAUDE.md                        # Project context for Claude Code
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## 3. Tauri IPC Contract

This is the interface between frontend and backend. Both sides must have matching types.

### Commands (Frontend → Rust → Response)

```
new_game(seed: Option<String>) → GameState
    Start a new run. Generate floor 1. Return initial visible state.

load_game() → Option<GameState>
    Load saved run if one exists. Returns None if no save.

save_game() → ()
    Persist current game state to SQLite. Called on quit and periodically.

player_action(action: PlayerAction) → TurnResult
    The core game loop command. Player performs an action, engine resolves
    the full turn (all entities act), returns updated state + events.

get_game_state() → GameState
    Re-fetch current visible state. Used after window resize or reconnect.

inspect_entity(entity_id: u32) → EntityDetail
    Get detailed info about an entity (triggers Ollama if text not cached).

get_run_history() → Vec<RunSummary>
    List all past runs.

get_high_scores() → Vec<HighScore>
    Top 10 scores.

get_settings() → Settings
    Read user configuration.

update_settings(settings: Settings) → ()
    Write user configuration.

check_ollama() → OllamaStatus
    Test Ollama connectivity and model availability.
```

### Events (Rust → Frontend, async push)

```
flavor_ready { entity_id: u32, text: String }
    Ollama finished generating text for an entity.

ollama_status { connected: bool, model: Option<String> }
    Ollama connection state changed.
```

### Core Types

```rust
// --- Actions ---

enum PlayerAction {
    Move(Direction),        // Move 1 tile or bump-attack enemy
    Wait,                   // Skip turn (gain full energy)
    PickUp,                 // Pick up item at player's position
    UseStairs,              // Ascend or descend stairs at position
    UseItem(u32),           // Use item by inventory index
    DropItem(u32),          // Drop item by inventory index
    EquipItem(u32),         // Equip item by inventory index
    UnequipSlot(EquipSlot), // Remove item from equipment slot
}

enum Direction {
    N, S, E, W, NE, NW, SE, SW,
}

enum EquipSlot {
    MainHand, OffHand, Head, Body, Ring, Amulet,
}

// --- Turn Result ---

struct TurnResult {
    state: GameState,
    events: Vec<GameEvent>,
    game_over: Option<GameOverInfo>,
}

struct GameState {
    player: PlayerState,
    visible_tiles: Vec<VisibleTile>,   // Only what FOV reveals
    visible_entities: Vec<EntityView>, // Enemies/items in FOV
    floor: u32,
    turn: u32,
    messages: Vec<LogMessage>,         // Recent messages (last 50)
    minimap: MinimapData,
}

struct PlayerState {
    position: Position,
    hp: i32,
    max_hp: i32,
    attack: i32,
    defense: i32,
    speed: i32,
    level: u32,
    xp: u32,
    xp_to_next: u32,
    inventory: Vec<ItemView>,
    equipment: EquipmentView,
    status_effects: Vec<StatusView>,
}

struct VisibleTile {
    x: i32,
    y: i32,
    tile_type: TileType,
    explored: bool,     // Previously seen (drawn dimmed if not currently visible)
    visible: bool,      // Currently in FOV (drawn fully lit)
}

struct EntityView {
    id: u32,
    name: String,
    position: Position,
    entity_type: EntityType,  // Enemy, Item, Door, Stair, Trap
    glyph: u32,               // Tileset sprite index
    hp: Option<(i32, i32)>,   // (current, max) if applicable
    flavor_text: Option<String>,
}

// --- Game Events (drive message log, animation, audio) ---

enum GameEvent {
    Moved { entity_id: u32, from: Position, to: Position },
    Attacked { attacker_id: u32, target_id: u32, damage: i32, killed: bool },
    DamageTaken { entity_id: u32, amount: i32, source: String },
    Healed { entity_id: u32, amount: i32 },
    ItemPickedUp { item: ItemView },
    ItemUsed { item: ItemView, effect: String },
    ItemDropped { item: ItemView },
    ItemEquipped { item: ItemView, slot: EquipSlot },
    StatusApplied { entity_id: u32, effect: StatusType, duration: u32 },
    StatusExpired { entity_id: u32, effect: StatusType },
    DoorOpened { position: Position },
    TrapTriggered { position: Position, trap_type: String, damage: i32 },
    StairsDescended { new_floor: u32 },
    EnemySpotted { entity_id: u32, name: String },
    LevelUp { new_level: u32 },
    FlavorText { text: String },
    PlayerDied { cause: String },
    BossDefeated { name: String, floor: u32 },
    Victory,
}

struct GameOverInfo {
    cause_of_death: String,
    epitaph: Option<String>,    // Ollama-generated
    final_score: u32,
    run_summary: RunSummary,
}

struct LogMessage {
    text: String,
    turn: u32,
    severity: LogSeverity,      // Info, Combat, Important, Flavor
}
```

---

## 4. Game State Machine

The application has distinct states with different input handling and rendering.

```
                    ┌──────────┐
                    │MainMenu  │
                    └────┬─────┘
                ┌────────┼────────┐
                ▼        ▼        ▼
          ┌──────┐ ┌────────┐ ┌────────┐
          │NewGame│ │LoadGame│ │Settings│
          └──┬───┘ └───┬────┘ └────────┘
             ▼         ▼
          ┌──────────────┐
          │   Playing     │◄──────────────┐
          │               │               │
          │  ┌──────────┐ │               │
          │  │Inventory  │ │               │
          │  │(overlay)  │ │               │
          │  └──────────┘ │               │
          │  ┌──────────┐ │               │
          │  │LevelUp    │ │               │
          │  │(modal)    │ │               │
          │  └──────────┘ │               │
          └──────┬────────┘               │
                 │ (death)                │
                 ▼                        │
          ┌──────────────┐                │
          │  DeathScreen  │               │
          │  (run summary)│               │
          └──────┬────────┘               │
                 │                        │
                 ▼                        │
          ┌──────────────┐                │
          │  HighScores   │───────────────┘
          └──────────────┘    (new game)
```

States:
- **MainMenu**: Title screen. Options: New Game, Continue (if save exists), High Scores, Run History, Settings.
- **Playing**: Game is active. Sub-modes: Normal (move/fight), Inventory (manage items), LevelUp (choose stat), Inspect (cursor mode).
- **DeathScreen**: Player died. Shows run summary, cause of death, epitaph, score. Options: New Game, Main Menu.
- **Victory**: Beat floor 10. Same as DeathScreen but celebratory.
- **Settings**: Configuration. Accessible from MainMenu and as a pause overlay during play.

---

## 5. Entity & Component Model

No full ECS framework. Entities are structs with optional component fields. This is simpler than a library-based ECS, trivially serializable with serde, and sufficient for a game with <500 entities per floor.

```rust
type EntityId = u32;

struct Entity {
    id: EntityId,
    name: String,
    position: Position,
    glyph: u32,                         // Tileset sprite index
    render_order: RenderOrder,          // Background, Item, Enemy, Player
    blocks_movement: bool,
    blocks_fov: bool,

    // --- Optional components ---
    health: Option<Health>,
    combat: Option<CombatStats>,
    ai: Option<AIBehavior>,
    inventory: Option<Inventory>,
    equipment: Option<EquipmentSlots>,
    item: Option<ItemProperties>,
    status_effects: Vec<StatusEffect>,
    fov: Option<FieldOfView>,
    door: Option<DoorState>,
    trap: Option<TrapProperties>,
    stair: Option<StairDirection>,
    loot_table: Option<LootTable>,      // What this entity drops on death
    flavor_text: Option<String>,
}

struct Position { x: i32, y: i32 }

struct Health {
    current: i32,
    max: i32,
}

struct CombatStats {
    base_attack: i32,
    base_defense: i32,
    base_speed: i32,                    // Energy gained per tick
    crit_chance: f32,                   // 0.0 - 1.0, base 0.08
}

enum AIBehavior {
    Melee,          // Path toward player, attack adjacent
    Ranged {        // Maintain distance, attack from range
        range: i32,
        preferred_distance: i32,
    },
    Passive,        // Ignore player unless attacked
    Fleeing,        // Run away (set dynamically when HP low)
    Boss(BossPhase),
}

enum BossPhase {
    Phase1,     // Normal behavior
    Phase2,     // Enraged (< 50% HP) — faster, stronger
}

struct Inventory {
    items: Vec<Entity>,     // Items are entities too
    max_size: usize,        // Player: 20, enemies: 0-3
}

struct EquipmentSlots {
    main_hand: Option<EntityId>,
    off_hand: Option<EntityId>,
    head: Option<EntityId>,
    body: Option<EntityId>,
    ring: Option<EntityId>,
    amulet: Option<EntityId>,
}

struct ItemProperties {
    item_type: ItemType,
    slot: Option<EquipSlot>,        // Where it can be equipped (if equippable)
    power: i32,                     // Attack bonus (weapon) or defense bonus (armor)
    effect: Option<ItemEffect>,     // Use effect (potions, scrolls)
    charges: Option<u32>,           // For wands
    energy_cost: i32,               // Action cost to use (default 100)
}

enum ItemType {
    Weapon, Armor, Shield, Ring, Amulet,
    Potion, Scroll, Wand, Key, Food,
}

enum ItemEffect {
    Heal(i32),
    DamageArea { damage: i32, radius: i32 },
    ApplyStatus { effect: StatusType, duration: u32 },
    RevealMap,
    Teleport,
    CureStatus,
}

struct DoorState {
    open: bool,
    locked: bool,
    key_id: Option<String>,     // Which key opens this door
}

struct TrapProperties {
    trap_type: TrapType,
    revealed: bool,             // Player has detected this trap
    triggered: bool,            // Already fired
}

enum TrapType {
    Spike { damage: i32 },
    Poison { damage: i32, duration: u32 },
    Teleport,
    Alarm,                      // Alerts all enemies on floor
}

enum StairDirection { Down, Up }

struct FieldOfView {
    radius: i32,
    visible_tiles: HashSet<Position>,
    dirty: bool,                // Needs recalculation
}

enum RenderOrder {
    Background = 0,     // Floor decorations
    Trap = 1,
    Item = 2,
    Door = 3,
    Enemy = 4,
    Player = 5,
}
```

### Entity Construction

Entities are built with factory functions, not inheritance:

```rust
fn spawn_player(position: Position) -> Entity { ... }
fn spawn_enemy(template: &EnemyTemplate, position: Position, rng: &mut StdRng) -> Entity { ... }
fn spawn_item(template: &ItemTemplate, position: Position, rng: &mut StdRng) -> Entity { ... }
fn spawn_door(position: Position, locked: bool) -> Entity { ... }
fn spawn_trap(trap_type: TrapType, position: Position) -> Entity { ... }
fn spawn_stairs(direction: StairDirection, position: Position) -> Entity { ... }
```

---

## 6. Map & Dungeon Generation

### Map Structure

```rust
struct Map {
    width: usize,               // Always 80
    height: usize,              // Always 50
    tiles: Vec<TileType>,       // width * height, row-major
    revealed: Vec<bool>,        // Player has seen this tile at some point
    rooms: Vec<Room>,
    blocked: Vec<bool>,         // Movement-blocked cache (walls + blocking entities)
}

const MAP_WIDTH: usize = 80;
const MAP_HEIGHT: usize = 50;

enum TileType {
    Wall,
    Floor,
    DownStairs,
    UpStairs,
    DoorClosed,
    DoorOpen,
}

struct Room {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    room_type: RoomType,
    center: Position,
}

enum RoomType {
    Normal,
    Treasure,       // Extra items, possibly trapped/guarded
    Boss,           // Contains floor boss
    Shrine,         // One-time buff when activated
    Library,        // Contains scrolls
    Armory,         // Contains weapons/armor
    Start,          // Player spawn room
}
```

### Seed System

All randomness flows from a single `u64` seed via `rand::rngs::StdRng`. Same seed + same floor = identical layout and entity placement. Seeds are displayed in the HUD and can be entered manually for a new game.

```rust
let rng = StdRng::seed_from_u64(seed);
// For floor N, derive a sub-seed:
let floor_rng = StdRng::seed_from_u64(seed.wrapping_add(floor as u64 * 0x9E3779B97F4A7C15));
```

### BSP Generation (Floors 1-3, parts of 4-6)

1. Start with the full map as one leaf node.
2. Recursively split nodes either horizontally or vertically.
   - Split axis: random, biased toward the longer dimension.
   - Split position: random within 40%-60% of the node's dimension.
   - Stop splitting when node is smaller than 12x10.
   - Minimum 5 leaves, maximum 12.
3. Place a room within each leaf node.
   - Room size: random within leaf bounds. Min 4x4, max leaf_size - 2 (padding).
   - Room centered randomly within leaf.
4. Connect sibling rooms with L-shaped corridors between room centers.
5. Validate full connectivity (flood fill from any room must reach all rooms).

Room constraints:
- Minimum room size: 4x4 (interior)
- Maximum room size: 12x10
- Minimum rooms per floor: 5
- 1-tile wall border around entire map

### Cellular Automata Generation (Floors 7-10, parts of 4-6)

1. Fill map with 45% wall, 55% floor (random).
2. Apply smoothing for 4-5 iterations:
   - If a tile has >= 5 wall neighbors (in 8-connected grid), it becomes wall.
   - If a tile has <= 3 wall neighbors, it becomes floor.
3. Flood fill to find the largest connected floor region.
4. Fill all disconnected regions with walls.
5. Identify "rooms" as connected open areas > 20 tiles.
6. Place doors at chokepoints (floor tiles with exactly 2 floor neighbors in cardinal directions, along an axis).

### Corridor Generation

For BSP dungeons: L-shaped corridors between sibling room centers.
```
From room A center to room B center:
  1. Carve horizontal from A.x to B.x at A.y
  2. Carve vertical from A.y to B.y at B.x
```

Corridor width: 1 tile. Corridors carve through walls — they are always Floor tiles.

### Special Room Assignment

After room generation, assign types:
- **Start room**: The room closest to map center. Player spawns here.
- **Stairs room**: The room furthest from the start room. Contains down stairs.
- **Boss room** (boss floors only): Second-furthest room. Locked door entrance. Boss Key drops from a miniboss or is found on the floor.
- **Treasure room**: 25% chance per floor for one room (not start/stairs/boss). 1-2 traps guarding it.
- **Shrine**: 15% chance per floor for one room.
- **Library/Armory**: 10% chance each per floor for one room.
- All remaining rooms: Normal.

### Entity Placement

After map and room assignment:

1. **Player**: Center of start room.
2. **Enemies**: Per room (not start room):
   - Normal rooms: `floor_number / 2 + rng.range(1, 3)` enemies.
   - Boss rooms: 1 boss + 1-2 minions.
   - Treasure rooms: 1-2 strong guards.
   - Enemy type selected from floor's enemy pool (see Section 14).
   - Placed at random floor tiles within the room, not on doors.
3. **Items**: Per room:
   - Normal rooms: 30% chance of 1 item.
   - Treasure rooms: 3-5 items.
   - Library: 2-3 scrolls.
   - Armory: 2-3 weapons/armor.
   - Shrine: 1 shrine entity (interactable, gives buff).
   - Item type selected from floor's loot table (see Section 13).
4. **Traps**: 1-3 per floor in corridors and treasure rooms. Hidden by default.
5. **Doors**: Placed at room entrances (tiles connecting rooms to corridors). 20% chance of locked door (key spawns elsewhere on floor).

---

## 7. Field of View

### Symmetric Shadowcasting

Use the symmetric shadowcasting algorithm. This guarantees: if the player can see an enemy, that enemy can see the player. Standard recursive shadowcasting doesn't have this property.

Algorithm overview:
1. Divide the circle around the viewer into 8 octants.
2. For each octant, scan rows/columns outward from the viewer.
3. Track the visible arc using slope ranges.
4. When a wall is encountered, split the visible arc.
5. Tiles are visible if their center falls within the visible arc.

Player FOV radius: **8 tiles** base (modified by equipment, status effects).

Visibility rules:
- **Visible tiles**: Fully lit. Entities visible. Tile remembered as explored.
- **Explored but not visible**: Drawn dimmed. No entities shown. Map layout visible.
- **Unexplored**: Not drawn at all (black/fog of war).

FOV recalculation trigger: After every player move or any event that changes blocking tiles (door open/close).

---

## 8. Turn System

### Energy-Based Turns

Every entity with a `CombatStats` component has a `speed` stat that determines how often they act.

```rust
struct TurnState {
    energy: HashMap<EntityId, i32>,
}

const ENERGY_THRESHOLD: i32 = 100;

fn resolve_turn(world: &mut World, player_action: PlayerAction) -> TurnResult {
    let mut events = Vec::new();

    // 1. Player acts (always has enough energy — UI only sends actions when ready)
    let action_cost = execute_action(world, PLAYER_ID, player_action, &mut events);
    world.energy[PLAYER_ID] -= action_cost;

    // 2. Grant energy to all entities
    for (id, combat) in &world.combatants {
        world.energy[id] += combat.base_speed;  // Modified by status effects
    }

    // 3. Process each non-player entity that has enough energy
    loop {
        let ready: Vec<EntityId> = world.entities_with_energy_above(ENERGY_THRESHOLD)
            .filter(|id| *id != PLAYER_ID)
            .collect();
        if ready.is_empty() { break; }

        for entity_id in ready {
            let ai_action = decide_action(world, entity_id);
            let cost = execute_action(world, entity_id, ai_action, &mut events);
            world.energy[entity_id] -= cost;
        }
    }

    // 4. Tick status effects (damage-over-time, duration countdown)
    tick_status_effects(world, &mut events);

    // 5. Recalculate player FOV
    recalculate_fov(world, PLAYER_ID);

    // 6. Check death/victory conditions
    let game_over = check_game_over(world);

    // 7. Build and return result
    TurnResult {
        state: build_visible_state(world),
        events,
        game_over,
    }
}
```

### Action Energy Costs

| Action | Energy Cost |
|--------|-------------|
| Move (1 tile) | 100 |
| Melee attack | 100 |
| Ranged attack | 100 |
| Pick up item | 50 |
| Use item | 100 (or item-specific) |
| Use stairs | 100 |
| Wait | 0 (but grants energy next tick) |
| Open door | 50 |
| Equip/Unequip | 50 |

### Speed Values

| Entity | Speed | Effect |
|--------|-------|--------|
| Player (base) | 100 | Acts every tick |
| Rat | 120 | Sometimes gets 2 actions |
| Goblin | 100 | Normal speed |
| Troll | 70 | Sometimes misses a tick |
| Vampire Bat | 130 | Fast |
| Boss (base) | 100 | Normal but high stats |

A "tick" happens every time the player acts. All entities gain `speed` energy, then any entity above 100 energy acts. This means a speed-130 bat accumulates 130 per tick and can sometimes act twice.

---

## 9. Pathfinding & Enemy AI

### Dijkstra Maps

Compute a Dijkstra map centered on the player position. This is a 2D grid where each tile's value is the shortest walking distance to the player. Compute once per turn; all enemies reference it.

```rust
fn compute_dijkstra_map(map: &Map, source: Position) -> Vec<i32> {
    // BFS/Dijkstra from source position
    // Walls = impassable (i32::MAX)
    // Each walkable tile gets distance value
    // Recompute only when player moves
}
```

Enemies pathfind by moving to the neighboring tile with the lowest Dijkstra value. This is O(1) per enemy per turn (just check 8 neighbors) after the O(N) map computation.

### A* Pathfinding

Used for specific queries: "can entity reach position X?" or pathfinding to non-player targets (items, flee points). Use A* with Manhattan distance heuristic for cardinal movement or Chebyshev for 8-directional.

### Enemy AI Behaviors

**Melee** (`AIBehavior::Melee`):
1. If player is adjacent → attack.
2. If player is in FOV → move toward player (follow Dijkstra map).
3. If player is not in FOV → patrol randomly (move to random adjacent floor tile).
4. If HP < 25% → switch to `Fleeing`.

**Ranged** (`AIBehavior::Ranged { range, preferred_distance }`):
1. If player is in range and in FOV → attack (line-of-sight check).
2. If player is closer than preferred_distance → move away from player.
3. If player is farther than range → move toward player.
4. If player is not in FOV → patrol randomly.

**Passive** (`AIBehavior::Passive`):
1. Do nothing unless attacked.
2. When first attacked → switch to `Melee`.

**Fleeing** (`AIBehavior::Fleeing`):
1. Move to the neighboring tile with the **highest** Dijkstra value (away from player).
2. If cornered (no tile has higher value) → attack in desperation.

**Boss** (`AIBehavior::Boss(phase)`):
- **Phase1**: Acts like Melee but with special attacks (area damage, summon minions).
- **Phase2** (triggered at < 50% HP): Speed increases by 30, attack increases by 3. Summon rate doubles. Messages announce the phase change.

### Enemy FOV

Enemies have FOV too (radius 6 for most, 8 for ranged). They can only detect the player within their FOV. The symmetric shadowcasting algorithm ensures mutual visibility.

---

## 10. Combat System

### Melee Attack Resolution

Triggered when a player or enemy moves into a tile occupied by a hostile entity ("bump to attack").

```
effective_attack = base_attack + weapon_power + buff_bonus
effective_defense = base_defense + armor_defense + shield_defense + buff_bonus

raw_damage = max(0, effective_attack - effective_defense)

// Variance: ±20% of raw damage, minimum 1 swing
variance = max(1, raw_damage / 5)
damage = max(1, raw_damage + rng.range(-variance, variance + 1))

// Critical hit check
if rng.gen::<f32>() < attacker.crit_chance:
    damage = (damage * 3) / 2     // 1.5x rounded down

// Shield absorption
if target has Shielded status:
    absorbed = min(damage, shield_remaining)
    damage -= absorbed
    reduce shield by absorbed

target.hp -= damage
if target.hp <= 0: target is dead
```

Minimum damage is always 1 if the attacker has any attack power. This prevents "can't damage" stalemates.

### Ranged Attack Resolution

Same formula but requires line-of-sight (Bresenham line between attacker and target must not pass through walls). No bump-to-attack for ranged; it's a dedicated action.

### Wand Attacks

Wands consume 1 charge per use. Same range/LOS check as ranged attacks. Effect is defined by the wand's `ItemEffect`. When charges reach 0, wand is destroyed.

---

## 11. Status Effects

```rust
struct StatusEffect {
    effect_type: StatusType,
    duration: u32,          // Turns remaining
    magnitude: i32,         // Effect strength (damage per turn, stat modifier, etc.)
    source: String,         // What caused this (for message log)
}

enum StatusType {
    Poison,         // Lose `magnitude` HP per turn
    Burning,        // Lose `magnitude` HP per turn
    Stunned,        // Cannot act next turn
    Confused,       // Movement direction randomized
    Weakened,       // Attack reduced by `magnitude`
    Blinded,        // FOV radius reduced to 2
    Regenerating,   // Gain `magnitude` HP per turn
    Hasted,         // Speed increased by `magnitude`
    Slowed,         // Speed decreased by `magnitude`
    Shielded,       // Absorb `magnitude` damage total (not per-turn)
    Invisible,      // Enemies cannot detect player
}
```

### Tick Resolution

During turn resolution, after all actions:
1. For each entity with status effects:
   - Apply per-turn effects (Poison/Burning damage, Regeneration healing).
   - Decrement duration.
   - Remove expired effects, emit `StatusExpired` event.
2. Stunned entities skip their next action (then Stun is removed).
3. Confused entities have their movement direction randomly reassigned.
4. Shielded has no duration — it lasts until its magnitude (HP buffer) is depleted.

### Immunity and Stacking

- Same status type does not stack; re-applying refreshes duration to the higher value.
- Bosses are immune to Stunned and Confused.
- Antidote potion clears all negative status effects.

---

## 12. Equipment & Inventory

### Equipment Slots

```
┌─────────┐
│  Head    │  Helmet: +defense
├─────────┤
│  Amulet  │  Amulet: special effect
├─────────┤
│  Body    │  Armor: +defense, may reduce speed
├─────────┤
│MainHand  │  Weapon: +attack, determines attack type
├─────────┤
│ OffHand  │  Shield: +defense, or second weapon
├─────────┤
│  Ring    │  Ring: special effect
└─────────┘
```

Equipping:
- If slot is occupied, the current item moves to inventory first.
- If inventory is full and slot is occupied, equip fails with a message.
- Equipping/unequipping costs 50 energy (half a turn).

### Inventory

- Player max inventory: 20 items.
- Items are ordered by pickup time.
- Quick-use keys (1-9) map to the first 9 inventory slots.
- Dropping an item places it on the player's tile.

### Stat Calculation

Effective stats are always computed from base + equipment + status effects. Never mutate base stats for temporary effects.

```rust
fn effective_attack(entity: &Entity) -> i32 {
    let base = entity.combat.map(|c| c.base_attack).unwrap_or(0);
    let weapon = equipped_weapon_power(entity);
    let buff = status_attack_modifier(entity);
    base + weapon + buff
}
```

---

## 13. Item Design

### Weapons

| Name | Power | Speed Mod | Special | Floor |
|------|-------|-----------|---------|-------|
| Dagger | 2 | +20 (fast) | — | 1+ |
| Short Sword | 4 | 0 | — | 1+ |
| Mace | 5 | 0 | 10% stun on hit | 2+ |
| Long Sword | 7 | 0 | — | 3+ |
| War Axe | 9 | -10 | — | 5+ |
| Great Sword | 11 | -20 (slow) | — | 7+ |
| Poison Dagger | 3 | +20 | Applies poison (2 dmg, 4 turns) | 4+ |
| Flame Blade | 8 | 0 | Applies burning (3 dmg, 3 turns) | 6+ |
| Frost Brand | 8 | 0 | Applies slowed (30, 3 turns) | 6+ |

### Armor

| Name | Defense | Speed Mod | Slot | Floor |
|------|---------|-----------|------|-------|
| Leather Cap | 1 | 0 | Head | 1+ |
| Iron Helm | 3 | 0 | Head | 4+ |
| Leather Armor | 2 | 0 | Body | 1+ |
| Chain Mail | 4 | -10 | Body | 3+ |
| Plate Armor | 7 | -20 | Body | 6+ |
| Wooden Shield | 1 | 0 | OffHand | 1+ |
| Iron Shield | 3 | 0 | OffHand | 3+ |
| Tower Shield | 5 | -10 | OffHand | 6+ |

### Accessories

| Name | Effect | Slot | Floor |
|------|--------|------|-------|
| Ring of Strength | +2 attack | Ring | 3+ |
| Ring of Protection | +2 defense | Ring | 3+ |
| Ring of Haste | +20 speed | Ring | 5+ |
| Ring of Regeneration | Regen 1 HP/turn | Ring | 6+ |
| Amulet of Health | +20 max HP | Amulet | 3+ |
| Amulet of Vision | +3 FOV radius | Amulet | 4+ |
| Amulet of Resistance | Status duration -50% | Amulet | 6+ |

### Consumables

| Name | Effect | Floor |
|------|--------|-------|
| Health Potion | Heal 25 HP | 1+ |
| Greater Health Potion | Heal 50 HP | 4+ |
| Potion of Strength | +3 attack for 20 turns | 3+ |
| Potion of Speed | +30 speed for 15 turns | 3+ |
| Potion of Invisibility | Invisible for 10 turns | 5+ |
| Antidote | Cure all negative status effects | 2+ |
| Scroll of Reveal | Reveal entire floor map | 2+ |
| Scroll of Teleport | Teleport to random room | 3+ |
| Scroll of Fireball | 20 damage to all in radius 3 | 5+ |
| Scroll of Confusion | Confuse all visible enemies, 5 turns | 4+ |
| Food Ration | Heal 15 HP | 1+ |
| Wand of Fire | Ranged 5, 8 charges, burning (3 dmg, 3 turns) | 4+ |
| Wand of Ice | Ranged 5, 8 charges, slowed (30, 3 turns) | 4+ |
| Wand of Lightning | Ranged 8, 5 charges, 12 direct damage | 6+ |

### Keys

| Name | Opens | Floor |
|------|-------|-------|
| Iron Key | Locked doors on current floor | 1+ |
| Boss Key | Boss room door on current floor | Boss floors |

Keys are consumed on use. Iron Keys are common; Boss Keys are placed once per boss floor.

### Loot Tables

Each floor has a weighted item pool. Higher floors add better items without removing lower-tier items (so you can still find daggers on floor 8 — they're just rare).

Spawn weights:
- Common: weight 10 (potions, food, basic weapons/armor)
- Uncommon: weight 5 (mid-tier gear, scrolls)
- Rare: weight 2 (high-tier gear, wands, rings)
- Very Rare: weight 1 (best weapons, amulets)

Items only appear on floors >= their minimum floor.

---

## 14. Enemy Design

### Bestiary

**Floors 1-3: The Dungeon**

| Enemy | HP | ATK | DEF | SPD | Behavior | Special |
|-------|-----|-----|-----|-----|----------|---------|
| Rat | 8 | 2 | 0 | 120 | Melee | — |
| Goblin | 15 | 4 | 1 | 100 | Melee | — |
| Goblin Archer | 10 | 3 | 0 | 100 | Ranged(5,3) | — |
| Skeleton | 18 | 5 | 3 | 90 | Melee | — |
| Giant Spider | 12 | 3 | 1 | 110 | Melee | Poison on hit (2, 3t) |

**Floors 4-6: The Caves**

| Enemy | HP | ATK | DEF | SPD | Behavior | Special |
|-------|-----|-----|-----|-----|----------|---------|
| Orc | 30 | 7 | 3 | 90 | Melee | — |
| Dark Mage | 15 | 2 | 1 | 100 | Ranged(6,4) | Confusion on hit (3t) |
| Cave Troll | 50 | 10 | 5 | 70 | Melee | — |
| Vampire Bat | 12 | 4 | 0 | 130 | Melee | Heals self for damage dealt |
| Mimic | 25 | 8 | 3 | 100 | Passive (until revealed) | Disguised as item |

**Floors 7-9: The Deep**

| Enemy | HP | ATK | DEF | SPD | Behavior | Special |
|-------|-----|-----|-----|-----|----------|---------|
| Wraith | 20 | 8 | 2 | 110 | Melee | Phases through walls, drains max HP |
| Fire Elemental | 35 | 9 | 4 | 100 | Melee | Burning on hit (3, 3t), immune to fire |
| Ice Golem | 60 | 7 | 8 | 60 | Melee | Slowed on hit (30, 2t) |
| Shadow | 15 | 12 | 1 | 120 | Melee | Invisible until adjacent, +30% crit |
| Necromancer | 25 | 3 | 2 | 90 | Ranged(6,5) | Summons 1 skeleton every 5 turns |

### Bosses

| Boss | Floor | HP | ATK | DEF | SPD | Abilities |
|------|-------|-----|-----|-----|-----|-----------|
| Goblin King | 3 | 80 | 8 | 4 | 100 | Summons 1 goblin every 4 turns. Phase 2: +3 ATK, summons every 2 turns. |
| Troll Warlord | 6 | 150 | 14 | 7 | 80 | Cleave attack (hits all adjacent). Phase 2: +30 SPD, +5 ATK. |
| The Lich | 10 | 120 | 10 | 5 | 100 | Ranged magic (8 range). Teleports when adjacent. Summons undead every 3 turns. Phase 2: AoE frost attack, immune to status. |

Boss rooms have a locked door. The Boss Key is found elsewhere on the floor (in a guarded room or carried by a miniboss-strength enemy).

### Enemy Scaling (Floors 11+, Endless Mode)

After floor 10, enemies repeat from the full bestiary with a scaling multiplier:

```
multiplier = 1.0 + (floor - 10) * 0.15
enemy.hp = (base_hp * multiplier) as i32
enemy.attack = (base_attack * multiplier) as i32
enemy.defense = (base_defense * multiplier) as i32
```

Every 5 floors after 10 (15, 20, 25...) has a boss encounter with the same scaling.

---

## 15. Floor Progression & Difficulty

| Floor | Dungeon Type | Enemy Pool | Special |
|-------|-------------|------------|---------|
| 1 | BSP | Rat, Goblin | Tutorial-ish, fewer enemies |
| 2 | BSP | Rat, Goblin, Goblin Archer | — |
| 3 | BSP | Skeleton, Giant Spider + pool | **Boss: Goblin King** |
| 4 | BSP (60%) / Cellular (40%) | Orc, Dark Mage | Transition to caves |
| 5 | BSP (40%) / Cellular (60%) | Full cave pool | — |
| 6 | Cellular | Cave pool | **Boss: Troll Warlord** |
| 7 | Cellular | Wraith, Fire Elemental | Hostile environment |
| 8 | Cellular | Full deep pool | — |
| 9 | Cellular | Full deep pool | — |
| 10 | Hand-designed layout | All | **Final Boss: The Lich** |
| 11+ | Cycling | All (scaled) | Endless mode. Boss every 5 floors. |

"BSP (60%) / Cellular (40%)" means: 60% chance the floor uses BSP, 40% cellular. Decided per-floor using the seeded RNG.

Floor 10 uses a fixed layout: a large central arena surrounded by corridors with treasure and minions. The Lich sits in the center. This layout is generated procedurally but with heavy constraints (single large room, symmetrical corridors).

---

## 16. Leveling & Scoring

### Experience & Leveling

```
XP gained per kill = enemy.max_hp
XP to next level = current_level * 150

On level up, player chooses one:
  - +10 max HP (and heal 10)
  - +2 base attack
  - +2 base defense
  - +15 base speed
```

Expected progression: ~level 3 by floor 3, ~level 6 by floor 6, ~level 9 by floor 10. Each level-up is a meaningful choice that shapes the run.

### Scoring

```
score = (floors_cleared * 1000)
      + (enemies_killed * 100)
      + (bosses_killed * 2000)
      + (level_reached * 500)
      + victory_bonus

victory_bonus = 10000 if floor 10 boss defeated, 0 otherwise
```

Score is calculated on death or victory and stored with the run record.

---

## 17. Ollama Flavor Engine

### Architecture

```
┌─────────────────────────────────┐
│  Game Engine (Rust)             │
│                                 │
│  On floor load:                 │
│   → Queue 5-10 item names      │
│   → Queue 3-5 enemy lore       │
│   → Queue 1 room desc/special  │
│   → Queue 1 death epitaph      │
│                                 │
│  FlavorQueue ──→ Ollama Client  │
│       ▲              │         │
│       │              ▼         │
│       │         HTTP POST      │
│       │     localhost:11434     │
│       │              │         │
│       │              ▼         │
│    Cache ◄── Response Text     │
│       │                        │
│       ▼                        │
│  entity.flavor_text = cached   │
│  emit("flavor_ready", id, txt) │
└─────────────────────────────────┘
```

### Request Management

- Ollama requests are fire-and-forget async tasks (tokio::spawn).
- Each request has a 3-second timeout. On timeout, use fallback template.
- Max 3 concurrent Ollama requests to avoid overwhelming the local model.
- Responses cached in a HashMap keyed by (seed, floor, entity_type, entity_index).
- Cache persists for the run duration.

### Prompt Templates

All prompts follow the same structure:

```
System: You are a darkly humorous dungeon narrator for a roguelike game.
Be concise. Maximum two sentences. Be creative and unexpected.

User: [specific request]
Format: [specific format]
```

**Item naming:**
```
User: Name a {item_type} found on floor {floor} of a dungeon. The item has {power} power.
Format: NAME | DESCRIPTION
Example: Blade of Premature Confidence | Its previous owner's last words were "watch this."
```

**Enemy lore:**
```
User: Write a one-line introduction for a {enemy_name} lurking in a {room_type}.
Format: Just the text, no formatting.
Example: The skeleton adjusts its jaw. It fell off again. It always falls off.
```

**Room description:**
```
User: Describe a {room_type} in a dungeon in one sentence. Floor {floor}, atmosphere: {atmosphere}.
Format: Just the text, no formatting.
```

**Death epitaph:**
```
User: Write a short, darkly humorous epitaph for an adventurer who died to {cause} on floor {floor} after killing {kill_count} enemies.
Format: Just the text, no formatting.
Example: Here lies a hero who brought a dagger to a troll fight.
```

### Fallback Templates

50+ pre-written items, 30+ enemy introductions, 20+ room descriptions, 20+ death epitaphs. Randomly selected when Ollama is unavailable. Stored in `src-tauri/src/flavor/templates.rs` as const arrays.

Fallback items still get randomized prefixes/suffixes:
```
{prefix} {base_name} {suffix}
Prefixes: Rusty, Ancient, Gleaming, Cursed, Blessed, Worn, Ornate
Suffixes: of Might, of Sorrows, of the Fallen, of Dubious Quality
```

### Settings

- `ollama_enabled: bool` — Master toggle.
- `ollama_url: String` — Default `http://localhost:11434`.
- `ollama_model: String` — Default `llama3.2:3b`. Configurable.
- `ollama_timeout_ms: u32` — Default `3000`.

---

## 18. Frontend Architecture

### Rendering

**HTML5 Canvas** for the game viewport. Not SVG — Canvas is faster for per-frame tile rendering at this scale.

Render pipeline per frame:
1. Clear viewport.
2. Calculate camera offset (center on player).
3. Draw floor tiles (only explored tiles).
4. Draw entities in render order (traps < items < doors < enemies < player).
5. Apply FOV overlay:
   - Visible tiles: full brightness.
   - Explored but not visible: 40% brightness (CSS filter or alpha overlay).
   - Unexplored: not drawn (black).
6. Draw animations (attack flash, damage numbers, movement lerp).

Tile size: **32x32 pixels**, configurable (16, 32, 48).

Camera: Centered on player. Smooth scroll (lerp camera position over 2-3 frames when player moves) for polish.

### UI Layout

```
┌──────────────────────────────────────────────────────┐
│ Floor 3 │ HP ██████████░░░░ 68/100 │ ⚔12 🛡5 ⚡100 │ Lv.4
├───────────────────────────────────┬──────────────────┤
│                                   │  ┌────────────┐  │
│                                   │  │  MINIMAP    │  │
│                                   │  │  (explored  │  │
│     GAME VIEWPORT                 │  │   rooms)    │  │
│     (Canvas, scrolling)           │  └────────────┘  │
│                                   │                  │
│     Player centered               │  EQUIPMENT       │
│     FOV with fog of war           │  [⚔] Long Sword  │
│     Entities visible              │  [🛡] Chain Mail  │
│                                   │                  │
│                                   │  INVENTORY (I)   │
│                                   │  1. Health Pot    │
│                                   │  2. Scroll        │
│                                   │  3. Iron Key      │
├───────────────────────────────────┤                  │
│  MESSAGE LOG                      │  [G]et [U]se     │
│  > The goblin strikes you for 4.  │  [D]rop [E]quip  │
│  > You descend deeper...          │  [>]Stairs       │
│  > A rat scurries in the dark.    │  [.]Wait [X]Look │
└───────────────────────────────────┴──────────────────┘
```

- **Top bar**: Floor number, HP bar (with numbers), attack/defense/speed stats, level.
- **Game viewport**: Main canvas area, takes ~70% width.
- **Right sidebar** (~300px): Minimap (top), equipment display, inventory list, key hints.
- **Bottom panel**: Scrollable message log (last 50 messages), with color coding by severity.

### Component Hierarchy

```
<App>
  <MainMenu />                  // or...
  <GameView>
    <HUD />                     // Top stats bar
    <div className="game-area">
      <GameCanvas />            // Main canvas
      <Minimap />               // Overlay, top-right of canvas
    </div>
    <Sidebar>
      <EquipmentPanel />
      <InventoryPanel />
      <KeyHints />
    </Sidebar>
    <MessageLog />              // Bottom
    <LevelUpModal />            // Overlay when leveling
    <InspectTooltip />          // Hover/cursor tooltip
  </GameView>
  <DeathScreen />               // or...
  <Settings />
</App>
```

### Animations

Keep animations short (100-200ms) so they don't slow down gameplay.

| Event | Animation |
|-------|-----------|
| Player/enemy move | Tile-to-tile lerp, 100ms |
| Attack | Attacker sprite nudges toward target, 100ms |
| Damage taken | Target flashes red, 150ms. Floating damage number. |
| Death | Entity fades out, 200ms |
| Item pickup | Item sprite rises and fades, 150ms |
| Stairs descend | Screen fade to black, 300ms, fade in on new floor |
| Level up | Gold flash overlay, 200ms |
| Status effect | Colored particle (green=poison, red=fire, blue=ice), looping while active |

Animations are non-blocking: the game state updates immediately, animations play catch-up. The player can act again as soon as the turn resolves, even if animations are still playing.

---

## 19. Input System

### Modal Input

Input handling changes based on the current sub-state:

**Normal mode** (playing):
- Movement keys → `PlayerAction::Move(direction)`
- Period/Numpad5 → `PlayerAction::Wait`
- G/Comma → `PlayerAction::PickUp`
- Greater-than → `PlayerAction::UseStairs`
- 1-9 → `PlayerAction::UseItem(index)`
- I → Open inventory mode
- X → Enter inspect mode
- Escape → Pause menu

**Inventory mode** (overlay open):
- Up/Down arrows → Navigate inventory list
- Enter → Use selected item
- E → Equip/unequip selected item
- D → Drop selected item
- Escape/I → Close inventory

**Inspect mode** (cursor active):
- Movement keys → Move cursor
- Enter → Inspect entity at cursor (shows detail + flavor text)
- Escape/X → Exit inspect mode

**Level-up mode** (modal):
- 1/2/3/4 or click → Select upgrade
- No other input accepted

**Menu mode** (main menu / settings):
- Arrow keys → Navigate
- Enter → Select
- Escape → Back

### Default Keybindings

```
Movement:
  Arrow Keys        — Cardinal directions
  WASD              — Cardinal directions
  Numpad 1-9        — All 8 directions + wait (5)
  HJKL              — Vi keys (left, down, up, right)
  YUBN              — Vi diagonals

Actions:
  Space / .         — Wait
  G / ,             — Pick up item
  >                 — Use stairs (descend)
  <                 — Use stairs (ascend)
  I                 — Toggle inventory
  X                 — Toggle inspect mode
  1-9               — Quick-use inventory item
  Escape            — Cancel / Menu

Inventory (when open):
  Up/Down / J/K     — Navigate
  Enter             — Use item
  E                 — Equip/unequip
  D                 — Drop
```

Keybindings are stored in settings and rebindable.

---

## 20. Audio

### Sound Design

All sounds are short, punchy, 8-bit/16-bit style. Generated with jsfxr or sourced from CC0 libraries.

| Event | Sound | Duration |
|-------|-------|----------|
| Player move | Soft footstep | ~100ms |
| Player attack (hit) | Slash/impact | ~150ms |
| Player attack (kill) | Crunchier impact | ~200ms |
| Player takes damage | Oof/grunt | ~150ms |
| Enemy death | Short splat | ~200ms |
| Item pickup | Cheerful blip | ~100ms |
| Potion use | Gulp/bubble | ~200ms |
| Scroll use | Magic shimmer | ~200ms |
| Door open | Creak | ~200ms |
| Stairs descend | Descending tone | ~300ms |
| Trap triggered | Spring/snap | ~150ms |
| Level up | Ascending fanfare | ~400ms |
| Boss encounter | Ominous sting | ~500ms |
| Player death | Sad descending tone | ~500ms |
| Victory | Triumphant fanfare | ~800ms |

### Ambient

- Subtle dungeon ambiance loop (dripping water, distant echoes).
- Volume reduced during boss fights (replaced with tension track).
- Ambient is a single looping .ogg file, crossfaded between floor types.

### Implementation

Frontend Web Audio API. Load all sounds on app startup into AudioBuffer objects. Play with `AudioContext.createBufferSource()` for zero-latency triggering. Volume controls in settings (master, SFX, ambient — each 0-100).

---

## 21. Persistence — SQLite

### Database Location

`$APPDATA/cryptforge/cryptforge.db` (Tauri app data directory).

### Schema

```sql
-- Active save state (only 1 row, deleted on death)
CREATE TABLE save_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    game_state BLOB NOT NULL,          -- serde-serialized full GameState
    saved_at TEXT NOT NULL,             -- ISO 8601 timestamp
    seed TEXT NOT NULL,
    floor INTEGER NOT NULL,
    turn INTEGER NOT NULL
);

-- Run history (one row per completed run)
CREATE TABLE runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seed TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    floors_cleared INTEGER NOT NULL,
    enemies_killed INTEGER NOT NULL,
    bosses_killed INTEGER NOT NULL,
    items_used INTEGER NOT NULL,
    level_reached INTEGER NOT NULL,
    cause_of_death TEXT,                -- NULL if victory
    death_epitaph TEXT,                 -- Ollama-generated
    victory INTEGER NOT NULL DEFAULT 0, -- 1 if player won
    score INTEGER NOT NULL
);

-- High scores (denormalized for fast leaderboard queries)
CREATE TABLE high_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES runs(id),
    score INTEGER NOT NULL,
    floors_cleared INTEGER NOT NULL,
    seed TEXT NOT NULL,
    achieved_at TEXT NOT NULL
);

-- User settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Schema version for migrations
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY
);
```

### Save/Load

- **Auto-save**: Every 10 turns, serialize full game state (World, Map, all entities, RNG state) to `save_state` table as a BLOB.
- **Save on quit**: Window close event triggers save.
- **Load on start**: If `save_state` row exists, show "Continue" option on main menu.
- **Delete on death**: When player dies, delete `save_state`, insert into `runs`.
- **Delete on victory**: Same as death but with `victory = 1`.

The RNG state must be serialized too. `StdRng` implements serde traits. This ensures resuming a saved game produces identical results to a continuous play session.

### Settings Defaults

```
tile_size = "32"
sound_volume = "80"
ambient_volume = "50"
fullscreen = "false"
ollama_enabled = "true"
ollama_url = "http://localhost:11434"
ollama_model = "llama3.2:3b"
ollama_timeout_ms = "3000"
autosave_interval = "10"
keybindings = "{...}"           -- JSON blob
```

---

## 22. Asset Strategy

### Tileset

**Primary: DawnLike by DragonDePlatino** (CC-BY 4.0)
- 16x16 pixel tiles, rendered at 2x (32x32) with nearest-neighbor scaling.
- Comprehensive roguelike tileset: walls, floors, items, enemies, UI elements, effects.
- Multiple color variants for dungeon/cave environments.
- Source: https://opengameart.org/content/dawnlike-16x16-universal-rogue-like-tileset-v181

**Fallback: Colored rectangles**
- During development, render tiles as colored rectangles with single-character labels.
- Wall = dark gray, Floor = dark brown, Player = white, Enemy = red, Item = yellow, Stairs = cyan.
- This ensures the game is playable before the tileset is integrated.

### Tileset Architecture

```typescript
interface Tileset {
    image: HTMLImageElement;         // Sprite sheet
    tileWidth: number;               // 16
    tileHeight: number;              // 16
    columns: number;                 // Tiles per row in sheet
    scale: number;                   // 2 (renders at 32x32)
}

// Sprite lookup: glyph ID → (row, column) in sprite sheet
function getTileRect(glyph: number): { sx: number, sy: number, sw: number, sh: number }
```

The `glyph` field on each entity maps to a specific sprite in the sheet. Glyph assignments are defined in a mapping file, making it easy to swap tilesets.

### Audio Assets

- SFX: Generated with jsfxr, exported as .ogg.
- Ambient: Source from Freesound.org (CC0) or generate with ambient generator.
- Total audio budget: < 5MB.

### Fonts

- UI text: System monospace font or bundled pixel font (e.g., Press Start 2P, SIL OFL).
- Message log: Monospace for alignment.
- HUD numbers: Bold/clear, high contrast.

---

## 23. Testing Strategy

### Rust (Game Engine) — Primary Testing Target

All game logic is in Rust. This is where correctness matters most.

**Unit tests** (per module):
- `dungeon/bsp.rs`: Generated map has rooms, all rooms connected (flood fill), rooms don't overlap, rooms within bounds.
- `dungeon/cellular.rs`: Generated map has one connected region, map is within bounds.
- `dungeon/placement.rs`: All entities placed on valid floor tiles, no two entities on same tile, stairs exist.
- `fov.rs`: Known map layouts produce expected visible tiles. Symmetry property holds (A sees B ↔ B sees A).
- `combat.rs`: Damage calculation matches formula. Crit multiplier applied correctly. Minimum 1 damage. Status effects applied on hit.
- `effects.rs`: Duration ticks correctly. Per-turn damage/healing applied. Expired effects removed. Non-stacking behavior.
- `pathfinding.rs`: Dijkstra map values correct for known layouts. A* finds shortest path. Unreachable tiles get max value.
- `ai.rs`: Melee enemy moves toward player. Ranged enemy maintains distance. Passive enemy doesn't move. Fleeing enemy moves away.
- `inventory.rs`: Equip/unequip modifies stats correctly. Full inventory rejects new items. Drop places item on floor.
- `state.rs`: Turn resolution processes all entities. Energy system accumulates correctly. Game over detected on player death.

**Integration tests**:
- Full turn resolution: player moves, enemies respond, state is consistent.
- Save/load roundtrip: serialize state, deserialize, state is identical.
- Multi-floor transition: descend stairs, new floor generated, player placed correctly.
- Seed determinism: same seed produces identical game state after N identical actions.

### Frontend — Minimal Testing

Canvas rendering and UI components are hard to unit test and low-risk. Focus on:
- Type correctness: TypeScript strict mode catches type mismatches with Rust IPC types.
- Input mapping: Verify keybindings map to correct PlayerAction values.
- API wrapper tests: Mock Tauri invoke, verify correct command names and argument shapes.

### Manual Playtesting

The most valuable testing for a game. After each major implementation milestone:
- Play through floors 1-3. Verify dungeon variety, combat feel, item usefulness.
- Play through floors 4-6. Verify difficulty scaling, cave layouts, boss fights.
- Play through to floor 10. Verify full progression, Lich fight, victory screen.
- Test death/save/resume cycle.
- Test with Ollama enabled and disabled.
- Test seed replay (same seed, same inputs → same outcome).

---

## Appendix: Removed / Explicitly Not Included

The following were considered and intentionally excluded:

- **Hunger system**: Adds tedium without fun. Not included.
- **Gold/shops/economy**: Complexity without sufficient payoff for this scope. Score comes from gameplay, not gold.
- **Multiplayer**: Single-player only.
- **Procedural music**: Sound effects and ambient loops are sufficient.
- **Character classes**: Single character type. Build diversity comes from level-up choices and equipment.
- **Crafting**: Items are found, not crafted.
- **Map persistence across floors**: Going back upstairs is not supported. Each floor is a one-way descent.
- **Achievements system**: Run history and high scores provide sufficient meta-progression.
