#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SMARTCODE_DIR="$(dirname "$SCRIPT_DIR")"
DEFAULT_ALGATOR_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

ALGATOR_BASE="${ALGATOR_ROOT:-$DEFAULT_ALGATOR_ROOT}"
SOURCE="${ALGATOR_PROJECTS:-$ALGATOR_BASE/data_root/projects}"
TARGET="${ALGATOR_LSYNC_ROOT:-$SMARTCODE_DIR/algator_lsync_root}"

if [ ! -d "$SOURCE" ]; then
  echo "ERROR: ALGator projects folder does not exist: $SOURCE"
  echo "Set ALGATOR_ROOT to the real ALGATOR_ROOT folder."
  exit 1
fi

if ! find "$SOURCE" -mindepth 1 -maxdepth 1 -type d -name 'PROJ-*' -print -quit | grep -q .; then
  echo "ERROR: no PROJ-* folders were found in: $SOURCE"
  exit 1
fi

mkdir -p "$TARGET"

RSYNC_ARGS=(
  -a
  --checksum
  --delete
  --prune-empty-dirs
  --filter='P .classpath'
  --filter='P .project'
  --filter='P .settings/***'
  --filter='P bin/***'
  --filter='P .smartcode-lsync-ready'
  --include='*/'
  --include='*.java'
  --include='*.c'
  --include='*.cpp'
  --include='*.cc'
  --include='*.cxx'
  --include='*.h'
  --include='*.hpp'
  --include='*.jar'
  --include='algorithm.json'
  --include='project.json'
  --include='.classpath'
  --include='.project'
  --include='.settings/'
  --include='.settings/**'
  --include='pom.xml'
  --include='build.gradle'
  --include='build.gradle.kts'
  --include='CMakeLists.txt'
  --include='compile_commands.json'
  --exclude='*'
)

sync_once() {
  rsync "${RSYNC_ARGS[@]}" "$SOURCE/" "$TARGET/"
}

echo "=== SmartCode lsync (lokalno) ==="
echo "  ALGATOR_ROOT: $ALGATOR_BASE"
echo "  Source:       $SOURCE"
echo "  Target:       $TARGET"

echo "[lsync] Initial sync..."
rm -f "$TARGET/.smartcode-lsync-ready"
sync_once
touch "$TARGET/.smartcode-lsync-ready"
echo "[lsync] Initial sync completed."

if command -v inotifywait >/dev/null 2>&1; then
  echo "[lsync] Watching with inotifywait..."
  while inotifywait -r -e modify,create,delete,move "$SOURCE" -q; do
    sync_once
  done
else
  echo "[lsync] inotifywait unavailable; polling every 2s..."
  while true; do
    sleep 2
    sync_once
  done
fi
