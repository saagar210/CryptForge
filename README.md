# CryptForge

Turn-based roguelike dungeon crawler built with Tauri, React, and Rust.

## Requirements

- Node.js 18+
- Rust toolchain
- Tauri 2 CLI

## Run

```bash
npm install
npm run tauri dev
```

### Lean Dev Mode (low disk)

Lean mode runs the same app startup command (`npm run tauri dev`) but puts heavy build caches in a temporary directory and removes them automatically when the process exits.

```bash
npm run dev:lean
```

Use this for daily work when disk pressure matters more than startup speed.

## Cleanup Commands

Targeted cleanup (heavy build artifacts only):

```bash
npm run clean:heavy
```

Removes:
- `dist`
- `src-tauri/target`
- `node_modules/.vite`

Full local cleanup (all reproducible local caches/deps):

```bash
npm run clean:full
```

Removes:
- `dist`
- `src-tauri/target`
- `node_modules`
- `.vite`
- `.cache`

## Normal vs Lean Tradeoffs

- Normal dev (`npm run tauri dev`): fastest warm starts, uses persistent local caches.
- Lean dev (`npm run dev:lean`): lower steady disk usage, but slower restarts/rebuilds because caches are ephemeral.
- `clean:heavy` is usually enough to reclaim space without deleting installed dependencies.
- `clean:full` reclaims the most space but requires reinstall/build cache warmup afterward.

## Verify

```bash
npm run verify:frontend
npm run verify:rust
```

## License

MIT
