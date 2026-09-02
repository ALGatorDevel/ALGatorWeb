#!/bin/bash
# Lokalni zagon LSP strežnika brez Dockerja.
# LSP uporablja neposredno algator_lsync_root, brez dodatne workspace mape.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ ! -d "$SCRIPT_DIR/js/node_modules" ]; then
  echo "[setup] npm install..."
  cd "$SCRIPT_DIR/js" && npm install && cd "$SCRIPT_DIR"
fi

export LSYNC_ROOT="$ROOT_DIR/algator_lsync_root"
export PROJECT_FOLDER="${1:-}"
export JDTLS_DATA_DIR="/tmp/smartcode-jdtls-data"

mkdir -p "$LSYNC_ROOT" "$JDTLS_DATA_DIR"

echo "=== SmartCode LSP (lokalno) ==="
echo "  algator_lsync_root: $LSYNC_ROOT"
echo "  projectFolder:      ${PROJECT_FOLDER:-(cel lsync-root)}"
echo "  URL:                http://localhost:3000"
echo ""

node "$SCRIPT_DIR/js/server.js"
