#!/usr/bin/env bash
# Launch a Helium (Chromium) dev instance with remote debugging enabled so the
# live, logged-in forocoches page can be inspected/driven over CDP (see cdp.mjs).
#
# Uses a DEDICATED profile in .helium-dev/ (Chromium refuses remote debugging on
# the default profile). Log into forocoches once here; the session persists.
#
# Usage: ./scripts/dev-browser.sh [url]
set -euo pipefail

PORT="${CDP_PORT:-9222}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="$REPO/.helium-dev"
URL="${1:-https://forocoches.com/foro/}"
HELIUM="${HELIUM_BIN:-/opt/helium-browser-bin/helium}"

if curl -s "http://localhost:$PORT/json/version" >/dev/null 2>&1; then
  echo "Dev browser already running on CDP port $PORT."
  echo "Tabs: node scripts/cdp.mjs tabs"
  exit 0
fi

echo "Starting Helium dev instance (CDP port $PORT, profile $PROFILE)..."
"$HELIUM" \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE" \
  --no-first-run --no-default-browser-check \
  "$URL" >/dev/null 2>&1 &

echo "Launched (pid $!). If this is the first run, log into forocoches once."
echo "Then, from the repo: node scripts/cdp.mjs tabs"
