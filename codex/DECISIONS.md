# Codex Decisions

## 2026-02-10

### D-001: Scope reduction to workflow hardening
- **Decision:** Focused implementation on verification/discovery ergonomics rather than gameplay changes.
- **Why:** Baseline evidence identified environment friction (`glib-2.0` missing), while core gameplay behavior could not be safely validated in this container.
- **Alternatives considered:**
  - Modifying Rust/Tauri dependencies to avoid glib linkage in tests (rejected: high risk and broad architectural impact).
  - Implementing gameplay refactors without full Rust verification (rejected: violates verification-first rule).

### D-002: Add preflight doctor script
- **Decision:** Added a dedicated Node script to proactively detect native dependency issues before Rust verification.
- **Why:** Converts opaque cargo failure into actionable, reproducible diagnostics and improves contributor onboarding.
- **Tradeoff:** Adds one maintenance script, but keeps logic small and isolated.
