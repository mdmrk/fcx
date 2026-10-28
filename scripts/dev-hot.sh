#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
PORT="${CDP_PORT:-9222}"
MATCH="${1:-}"

if ! curl -s "http://localhost:$PORT/json/version" >/dev/null 2>&1; then
  ./scripts/dev-browser.sh "${1:-https://forocoches.com/foro/}"
  sleep 5
fi

pnpm build:watch >/dev/null 2>&1 &
BUILD_PID=$!
cleanup() { kill "$BUILD_PID" 2>/dev/null || true; pkill -P "$BUILD_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

for _ in $(seq 1 60); do [ -s dist/fcx.user.js ] && break; sleep 0.5; done

node scripts/cdp.mjs watch "$MATCH"
