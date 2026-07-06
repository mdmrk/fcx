#!/usr/bin/env bash
# One-command hot-reload loop: rebuild the userscript on every save AND reload +
# reinject it into the live forocoches tab over CDP.
#
#   pnpm dev:hot [urlMatch]
#
# Needs the dev browser running (./scripts/dev-browser.sh); if it isn't, this
# launches it. `urlMatch` selects which tab to drive (default: the forocoches
# tab). Ctrl-C stops both the build watcher and the reload loop.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
PORT="${CDP_PORT:-9222}"
MATCH="${1:-}"

# 1) Ensure the dev browser (with remote debugging) is up.
if ! curl -s "http://localhost:$PORT/json/version" >/dev/null 2>&1; then
  ./scripts/dev-browser.sh "${1:-https://forocoches.com/foro/}"
  sleep 5
fi

# 2) Rebuild-on-save in the background (esbuild watch → dist/fcx.user.js).
pnpm build:watch >/dev/null 2>&1 &
BUILD_PID=$!
cleanup() { kill "$BUILD_PID" 2>/dev/null || true; pkill -P "$BUILD_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

# 3) Wait for the first build to produce the bundle before attaching the injector.
for _ in $(seq 1 60); do [ -s dist/fcx.user.js ] && break; sleep 0.5; done

# 4) Reload + reinject on each rebuild (foreground; Ctrl-C ends everything).
node scripts/cdp.mjs watch "$MATCH"
