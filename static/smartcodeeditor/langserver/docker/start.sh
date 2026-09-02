#!/usr/bin/env bash
set -euo pipefail

ROOT="${LSYNC_ROOT:-/algator_lsync_root}"

# PROJECT_FOLDER ni nujen pri zagonu containerja.
# Nastavi se lahko kasneje iz spletnega urejevalnika, ko uporabnik izbere projekt.
PROJECT="${PROJECT_FOLDER:-}"

mkdir -p "$ROOT" /tmp/jdtls-data

cat <<INFO
=== SmartCode LSP ===
  LSYNC_ROOT:     $ROOT
  PROJECT_FOLDER: ${PROJECT:-not set - editor ga poda kasneje}
  URL:            http://localhost:3000
INFO

# CMake za clangd, če obstaja CMakeLists.txt v korenu sinhronizirane mape.
if [ -f "$ROOT/CMakeLists.txt" ]; then
  echo "[lsp] Running cmake for clangd..."
  cmake -S "$ROOT" -B "$ROOT/build" \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=1 \
    -DCMAKE_BUILD_TYPE=Debug 2>&1 || true
fi

echo "[lsp] Starting Node LSP bridge..."
exec node /app/server.js
