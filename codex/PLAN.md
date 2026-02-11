# Delta Plan

## A) Executive Summary

### Current state (repo-grounded)
- React + TypeScript frontend with Vite build pipeline and strict TypeScript compile in build path. (`package.json`, `tsconfig.json`)
- Rust + Tauri backend contains core engine modules (`state`, `combat`, `ai`, `map`, `inventory`, etc.). (`src-tauri/src/engine/*`)
- Project docs define architecture boundaries: gameplay logic in Rust; frontend renderer-only. (`README.md`, `docs/DESIGN.md`, `CLAUDE.md`)
- Baseline frontend verification is healthy (`npm run build` passes).
- Baseline Rust verification in this environment fails due missing native system package (`glib-2.0`).
- Existing scripts do not provide a preflight diagnostic for native Tauri/Rust prerequisites.

### Key risks
- Contributor friction due opaque native dependency failures during `cargo test`.
- Risk of unverified backend changes in environments lacking Tauri-native dependencies.
- Potential mismatch between “project status” claims and what new contributors can validate locally.

### Improvement themes (prioritized)
1. Verification ergonomics and environment diagnostics.
2. Documentation clarity around verification pathways.
3. Session resumability and auditable execution trail.

## B) Constraints & Invariants (Repo-derived)

### Explicit invariants
- Keep gameplay logic in Rust; do not shift logic into frontend.
- Avoid changing IPC contracts/types without end-to-end validation.
- Keep changes small, reversible, and non-breaking.

### Implicit invariants (inferred)
- `npm run build` must remain green for frontend correctness.
- Rust verification should remain available and deterministic when dependencies are installed.

### Non-goals
- No gameplay feature additions/refactors.
- No persistence schema changes.
- No Tauri config/security model changes.

## C) Proposed Changes by Theme (Prioritized)

### Theme 1: Verification ergonomics
- **Current:** Verification commands are split and native dependency failures surface late during cargo build.
- **Proposed:** Add a preflight script checking `pkg-config` and `glib-2.0` availability.
- **Why:** Fast failure with actionable guidance reduces onboarding time.
- **Tradeoffs:** Linux-specific checks in first version; may need extension for macOS/Windows.
- **Scope boundary:** Script + npm wiring only.
- **Migration approach:** additive; no existing behavior removed.

### Theme 2: Documentation clarity
- **Current:** README has quick start but limited troubleshooting for native Rust/Tauri requirements.
- **Proposed:** Add verification commands and native dependency note.
- **Why:** Align contributor expectations with actual build/runtime constraints.
- **Tradeoffs:** Slightly longer README.
- **Scope boundary:** README update only.
- **Migration approach:** additive section.

### Theme 3: Resume hardening
- **Current:** No codex session artifacts in repo.
- **Proposed:** Add codex planning/log files.
- **Why:** interruption-safe handoff and traceability.
- **Tradeoffs:** Additional docs footprint.
- **Scope boundary:** `codex/*` markdown files.
- **Migration approach:** additive.

## D) File/Module Delta (Exact)

### ADD
- `scripts/doctor-tauri.mjs` — native dependency preflight checks.
- `codex/SESSION_LOG.md` — step-by-step session log.
- `codex/PLAN.md` — this plan.
- `codex/DECISIONS.md` — major judgment calls.
- `codex/CHECKPOINTS.md` — interruption-safe checkpoints.
- `codex/VERIFICATION.md` — command evidence.
- `codex/CHANGELOG_DRAFT.md` — delivery draft.

### MODIFY
- `package.json` — add verification/doctor scripts.
- `README.md` — add verification + troubleshooting guidance.

### REMOVE/DEPRECATE
- None.

### Boundary rules
- Allowed: docs, package scripts, utility scripts.
- Forbidden: engine logic, persistence schema, IPC contract, Tauri capabilities.

## E) Data Models & API Contracts (Delta)
- **Current:** Core contracts in Rust engine + TS mirror types.
- **Proposed:** No data model/API contract changes.
- **Compatibility:** Fully backward compatible.
- **Migrations:** None.
- **Versioning strategy:** N/A for this delta.

## F) Implementation Sequence (Dependency-Explicit)
1. Add doctor script.
   - Preconditions: Node available.
   - Verify: `node scripts/doctor-tauri.mjs`.
   - Rollback: remove script file.
2. Wire npm scripts.
   - Preconditions: doctor script exists.
   - Verify: `npm run doctor:tauri`, `npm run verify:frontend`.
   - Rollback: revert `package.json`.
3. Update README verification docs.
   - Preconditions: scripts finalized.
   - Verify: `npm run verify:frontend`.
   - Rollback: revert README section.
4. Final run and artifact updates.
   - Verify: `npm run verify:frontend`, `npm run verify:rust` (expected env warning).
   - Rollback: revert last doc/artifact updates if needed.

## G) Error Handling & Edge Cases
- Current pattern: build errors bubble directly from toolchains.
- Improvement: doctor script gives explicit diagnostics for missing `pkg-config` and `glib-2.0`.
- Edge cases:
  - `pkg-config` absent.
  - `pkg-config` present but `glib-2.0.pc` missing.
  - Unexpected script failure (handled with explicit non-zero exit + message).
- Tests: runtime execution checks via script command outputs.

## H) Integration & Testing Strategy
- Integration points:
  - npm scripts to local tooling.
  - README instructions to actual commands.
- Tests/verification:
  - Run doctor script directly.
  - Run npm script wrappers.
  - Run frontend verification full command.
- DoD:
  - Commands exist and behave as documented.
  - README reflects true verification pathways.
  - Session artifacts completed.

## I) Assumptions & Judgment Calls
### Assumptions
- Linux contributor environment for current diagnostics.
- Existing container intentionally lacks glib dev packages.

### Judgment calls
- Chose workflow hardening over backend code change due unverifiable Rust path in environment.
- Avoided speculative engine changes absent failing tests or bug reports.
