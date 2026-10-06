#!/usr/bin/env bash
# test-generation: one-shot activation script.
#
# Actions (idempotent):
#   1. Copy runtime/config.json    -> .workplace/test-generation/config.json
#   2. Copy runtime/TestGeneration/ -> ${PROJECT_ROOT}/TestGeneration/
#      (existing tests/locator caches preserved via cp -n)
#   3. Write a SUCCESS entry to .workplace/state.json
#
# Re-running with the marker present is a no-op.

set -euo pipefail

PACKAGE_NAME="test-generation"
PLUGIN_ROOT="${PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"

MARKER_DIR=".workplace/activated"
MARKER_FILE="${MARKER_DIR}/${PACKAGE_NAME}.marker"
mkdir -p "${MARKER_DIR}"

if [[ -f "${MARKER_FILE}" ]]; then
  exit 0
fi

# 1. Copy config.json
CFG_DIR=".workplace/test-generation"
mkdir -p "${CFG_DIR}"
if [[ -f "${PLUGIN_ROOT}/runtime/config.json" && ! -f "${CFG_DIR}/config.json" ]]; then
  cp "${PLUGIN_ROOT}/runtime/config.json" "${CFG_DIR}/config.json"
fi

# 2. Copy runtime/TestGeneration/ -> project root
RUNTIME_SRC="${PLUGIN_ROOT}/runtime/TestGeneration"
RUNTIME_DST="${PROJECT_ROOT}/TestGeneration"
if [[ -d "${RUNTIME_SRC}" ]]; then
  if [[ -d "${RUNTIME_DST}" ]]; then
    # Merge: copy only files that do not already exist (preserve user edits)
    cp -RTn "${RUNTIME_SRC}/" "${RUNTIME_DST}/"
  else
    cp -R "${RUNTIME_SRC}" "${RUNTIME_DST}"
  fi
fi

# 3. Update .workplace/state.json
mkdir -p .workplace
STATE=".workplace/state.json"
if [[ ! -f "${STATE}" ]]; then echo '{"packages":{}}' > "${STATE}"; fi
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if command -v python3 >/dev/null 2>&1; then
  python3 - "$STATE" "$PACKAGE_NAME" "$TS" <<'PY'
import json, sys
path, name, ts = sys.argv[1:]
data = json.load(open(path))
data.setdefault("packages", {})[name] = {"status": "active", "activatedAt": ts}
json.dump(data, open(path, "w"), indent=2)
PY
fi

echo "${TS}" > "${MARKER_FILE}"
exit 0
