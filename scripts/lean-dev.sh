#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEAN_TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cryptforge-lean.XXXXXX")"
LEAN_CARGO_TARGET_DIR="$LEAN_TMP_DIR/cargo-target"
LEAN_VITE_CACHE_DIR="$LEAN_TMP_DIR/vite-cache"
LEAN_AUTO_EXIT_SECONDS="${LEAN_AUTO_EXIT_SECONDS:-}"
LEAN_DEV_PID=""
LEAN_TIMER_PID=""

cleanup() {
  local exit_code=$?

  if [[ -n "$LEAN_TIMER_PID" ]] && kill -0 "$LEAN_TIMER_PID" 2>/dev/null; then
    kill "$LEAN_TIMER_PID" 2>/dev/null || true
  fi

  if [[ -n "$LEAN_DEV_PID" ]] && kill -0 "$LEAN_DEV_PID" 2>/dev/null; then
    pkill -TERM -P "$LEAN_DEV_PID" 2>/dev/null || true
    kill "$LEAN_DEV_PID" 2>/dev/null || true
    wait "$LEAN_DEV_PID" 2>/dev/null || true
  fi

  rm -rf "$LEAN_TMP_DIR"
  exit "$exit_code"
}

trap cleanup EXIT INT TERM

mkdir -p "$LEAN_CARGO_TARGET_DIR" "$LEAN_VITE_CACHE_DIR"

echo "lean-dev: using temporary cache dir $LEAN_TMP_DIR"

if [[ -n "$LEAN_AUTO_EXIT_SECONDS" ]]; then
  (
    sleep "$LEAN_AUTO_EXIT_SECONDS"
    if [[ -n "$LEAN_DEV_PID" ]] && kill -0 "$LEAN_DEV_PID" 2>/dev/null; then
      echo "lean-dev: auto-stopping after ${LEAN_AUTO_EXIT_SECONDS}s"
      pkill -TERM -P "$LEAN_DEV_PID" 2>/dev/null || true
      kill "$LEAN_DEV_PID" 2>/dev/null || true
    fi
  ) &
  LEAN_TIMER_PID=$!
fi

cd "$ROOT_DIR"
CARGO_TARGET_DIR="$LEAN_CARGO_TARGET_DIR" \
VITE_CACHE_DIR="$LEAN_VITE_CACHE_DIR" \
npm run tauri -- dev "$@" &
LEAN_DEV_PID=$!
wait "$LEAN_DEV_PID"
