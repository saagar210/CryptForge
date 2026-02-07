# CryptForge

Turn-based roguelike dungeon crawler. Tauri 2 + React 19 + Rust + SQLite + Ollama.

## Architecture

- **All game logic lives in Rust** — the frontend is purely a renderer
- Frontend sends `PlayerAction` via Tauri commands, receives `TurnResult` with visible state + events
- Ollama is an optional async flavor layer — game works without it
- SQLite for active save, run history, high scores, settings
- Full spec: `docs/DESIGN.md`

## Tech Stack

| Layer | Tech |
|-------|------|
| Game Engine | Rust (Tauri 2 backend) |
| Renderer | React 19 + TypeScript + HTML5 Canvas (Vite) |
| Audio | Web Audio API (frontend) |
| Flavor | Ollama (local LLM, optional) |
| Persistence | SQLite via rusqlite |

## Key Design Decisions

- **Hybrid component model** — Entities are structs with optional component fields. No ECS framework.
- **Energy-based turn system** — Speed stat determines action frequency. 100 energy = 1 action.
- **Symmetric shadowcasting** — Player and enemies have mutual visibility.
- **Dijkstra maps** — Computed once per turn, all enemies follow the gradient. A* for specific queries.
- **BSP + cellular automata** — Structured dungeons early, organic caves late.
- **Save-on-quit** — Serialize full state to SQLite BLOB. Delete save on death (permadeath).
- **Seed determinism** — All randomness from a single u64 seed. Same seed + same inputs = same game.

## Conventions

- Rust: snake_case, `Result`/`Option` for errors, serde for serialization
- TypeScript: strict mode, no `any`, interfaces for all IPC types
- Frontend never contains game logic — zero gameplay computation in React
- Every Tauri command has matching TypeScript types in `src/types/game.ts`
- Tests focus on Rust game engine (unit + integration). Frontend is type-checked, not unit-tested.

## Directory Structure

```
src-tauri/src/
  commands.rs         — Tauri IPC command handlers
  engine/             — Game engine (state, entities, map, dungeon gen, FOV, combat, AI, effects, inventory, items, enemies, leveling)
  flavor/             — Ollama client, prompt templates, fallback text, cache
  persistence/        — SQLite schema, save/load, settings

src/
  components/game/    — GameView, GameCanvas, Minimap, HUD, MessageLog, InventoryPanel, DeathScreen, LevelUpModal
  components/menu/    — MainMenu, HighScores, RunHistory, Settings
  hooks/              — useGameState, useInput, useAudio
  lib/                — api (typed Tauri wrappers), renderer, tiles, audio
  types/game.ts       — TypeScript interfaces mirroring Rust types
  assets/             — Tilesets, sounds, fonts
```

## IPC Contract (summary)

Commands: `new_game`, `load_game`, `save_game`, `player_action`, `get_game_state`, `inspect_entity`, `get_run_history`, `get_high_scores`, `get_settings`, `update_settings`, `check_ollama`

Core flow: `player_action(PlayerAction) → TurnResult { state, events, game_over }`

Events drive everything: message log, animations, sound effects. Frontend reacts to `GameEvent` variants.

## Game Structure

- 10 main floors + endless mode after victory
- Boss fights on floors 3, 6, 10
- Floors 1-3: BSP dungeons, Floors 4-6: Mixed, Floors 7-10: Cellular automata caves
- 6 equipment slots, 20-slot inventory, 10 status effects
- Energy-based turns with speed variation
- XP from kills → level up → choose stat upgrade
