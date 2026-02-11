# 🗡️ CryptForge

**Turn-based roguelike dungeon crawler** — Delve deep, die often, try again.

Built with **Tauri 2** + **React 19** + **Rust** + **SQLite** + **Ollama**.

---

## ✨ Features

**Core Gameplay**
- 🎲 10 procedurally-generated floors + endless mode
- ⚔️ Energy-based combat with speed variation
- 🧙 3 character classes: Warrior, Rogue, Mage
- 📜 Abilities, spells, and status effects
- 🎒 Equipment system with enchanting and crafting
- 🍖 Hunger clock — find food or starve
- 💀 Permadeath (saves deleted on death)

**Dungeon Features**
- 🏰 BSP dungeons → mixed → organic caves as you descend
- 👑 Boss fights on floors 3, 6, 10
- 👹 Elite enemies with unique mechanics
- 🤝 NPC allies that fight alongside you
- 🚪 Secret rooms hidden behind walls
- 🏪 Shops, anvils, and interactive objects

**Polish**
- 🎨 ASCII + sprite tilesets with biome-themed palettes
- 🎵 Procedural Web Audio (no asset files)
- ✨ Particle effects, screen shake, FOV transitions
- 📊 Statistics dashboard, achievements, daily challenges
- 🎯 Run modifiers: Glass Cannon, Marathon, Pacifist, Cursed
- 🌐 Optional Ollama integration for flavor text

---

## 🚀 Quick Start

```bash
npm install
npm run tauri dev
```

**Requirements:** Rust, Node.js 18+, Tauri 2 CLI


## ✅ Verification

```bash
npm run verify:frontend
npm run verify:rust
```

- `verify:frontend` runs TypeScript + production build checks.
- `verify:rust` runs a native dependency preflight and then `cargo test`.

### Linux note (Tauri native deps)

If `verify:rust` fails on `glib-2.0`, install your distro glib dev package (for example `libglib2.0-dev`) and ensure `pkg-config` is installed.

---

## 🎮 Controls

- **Arrow keys / WASD** — Move
- **Space / 5** — Wait
- **I** — Inventory
- **</>** — Stairs
- **G** — Pickup
- **A** — Auto-explore
- **1-4** — Use abilities
- **Mouse** — Click to move/target

---

## 🧪 Tech Stack

| Layer | Tech |
|-------|------|
| Game Engine | Rust (all logic, no frontend computation) |
| Renderer | React 19 + TypeScript + Canvas |
| Audio | Web Audio API (procedural) |
| Flavor | Ollama (optional async) |
| Persistence | SQLite (saves, scores, settings) |

---

## 📦 Project Status

**Phase 3: Feature Expansion — COMPLETE**
- 160 Rust tests passing ✅
- TypeScript strict mode clean ✅
- All 16 Phase 3 features shipped ✅

**Recent:**
- Comprehensive codebase audit: 9 bugs fixed
- Secret rooms, daily challenges, run modifiers
- Enhanced boss mechanics, crafting system
- Particle effects, death animations, FOV transitions

---

## 🏗️ Architecture

- **All game logic in Rust** — frontend is purely a renderer
- **Energy-based turns** — speed determines action frequency
- **Symmetric FOV** — mutual visibility (Dijkstra maps for AI)
- **Seed-based RNG** — deterministic replays
- **Save-on-quit** — full state serialization to SQLite

Full design doc: `docs/DESIGN.md`

---

## 📜 License

MIT

---

**Descend. Fight. Survive. Repeat.**
