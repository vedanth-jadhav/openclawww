#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/vedanthjadhav/code/claude"

cd "$ROOT"

if [ -f package-lock.json ] && [ -f package.json ]; then
  npm install
fi

if [ -d "$ROOT/cli" ] && [ -f "$ROOT/cli/package.json" ] && [ -f "$ROOT/cli/package-lock.json" ]; then
  npm --prefix "$ROOT/cli" install
fi

exit 0
