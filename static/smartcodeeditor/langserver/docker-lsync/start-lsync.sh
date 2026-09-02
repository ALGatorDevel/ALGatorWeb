#!/usr/bin/env bash
set -euo pipefail

SOURCE="${LSYNC_SOURCE:-/algator_root/data_root/projects}"
TARGET="${LSYNC_TARGET:-/algator_lsync_root}"
POLL_INTERVAL="${LSYNC_POLL_INTERVAL:-1}"
VERBOSE="${LSYNC_VERBOSE:-0}"
READY_FILE="$TARGET/.smartcode-lsync-ready"

mkdir -p "$TARGET" /var/log/lsyncd

echo "=== SmartCode lsync ==="
echo "Source: $SOURCE"
echo "Target: $TARGET"
echo "Direction: source -> target"

if [ ! -d "$SOURCE" ]; then
  echo "ERROR: source folder does not exist: $SOURCE"
  exit 1
fi

if ! find "$SOURCE" -mindepth 1 -maxdepth 1 -type d -name 'PROJ-*' -print -quit | grep -q .; then
  echo "ERROR: no PROJ-* folders found in: $SOURCE"
  exit 1
fi

SOURCE_ID="$(stat -c '%d:%i' "$SOURCE" 2>/dev/null || true)"
TARGET_ID="$(stat -c '%d:%i' "$TARGET" 2>/dev/null || true)"
if [ -n "$SOURCE_ID" ] && [ "$SOURCE_ID" = "$TARGET_ID" ]; then
  echo "ERROR: source and target are the same directory"
  exit 1
fi

sync_once() {
  local args=(
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

  if [ "$VERBOSE" = "1" ]; then
    rsync "${args[@]}" --itemize-changes "$SOURCE/" "$TARGET/"
  else
    rsync "${args[@]}" "$SOURCE/" "$TARGET/"
  fi
}

rm -f "$READY_FILE"
sync_once
touch "$READY_FILE"
echo "[lsync] Initial sync completed."

if [ "$POLL_INTERVAL" != "0" ]; then
  while true; do
    sleep "$POLL_INTERVAL"
    sync_once
  done &
fi

exec lsyncd -nodaemon /etc/lsyncd.conf.lua
