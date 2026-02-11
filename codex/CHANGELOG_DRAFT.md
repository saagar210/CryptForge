# Changelog Draft

## Theme: Verification Ergonomics
- Added `scripts/doctor-tauri.mjs` to detect missing native Linux dependencies required for Tauri/Rust builds.
- Added npm commands:
  - `doctor:tauri`
  - `verify:frontend`
  - `verify:rust`
  - `verify`

## Theme: Documentation Clarity
- Added a README verification section with exact commands.
- Added Linux troubleshooting guidance for `glib-2.0` / `pkg-config` prerequisite issues.

## Theme: Session Resilience
- Added codex operational artifacts (`PLAN`, `SESSION_LOG`, `DECISIONS`, `CHECKPOINTS`, `VERIFICATION`) to support interruption-safe continuation.
