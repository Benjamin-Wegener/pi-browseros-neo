#!/usr/bin/env bash
# One-line installer for pi-browseros-neo.
#   curl -fsSL https://raw.githubusercontent.com/Benjamin-Wegener/pi-browseros-neo/main/install.sh | bash
# Add --uninstall to remove it again.
# Add --with-guidelines to also append the verification guidelines to ~/.pi/agent/AGENTS.md.
set -euo pipefail

if [ "${1:-}" = "--uninstall" ]; then
  rm -f "${PI_DIR:-$HOME/.pi/agent}/extensions/browseros-neo.ts"
  rm -rf "${PI_DIR:-$HOME/.pi/agent}/skills/browseros-neo-pi"
  echo "Removed pi-browseros-neo. AGENTS.md was left untouched."
  exit 0
fi

REPO="https://github.com/Benjamin-Wegener/pi-browseros-neo.git"
PI_DIR="${PI_DIR:-$HOME/.pi/agent}"
WITH_GUIDELINES=0
[ "${1:-}" = "--with-guidelines" ] && WITH_GUIDELINES=1

# Use the local checkout when run from one, otherwise clone to a temp dir.
SRC="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
if [ ! -f "$SRC/extensions/browseros-neo.ts" ]; then
  SRC="$(mktemp -d)"
  trap 'rm -rf "$SRC"' EXIT
  git clone --depth 1 "$REPO" "$SRC"
fi

mkdir -p "$PI_DIR/extensions" "$PI_DIR/skills/browseros-neo-pi"
cp "$SRC/extensions/browseros-neo.ts" "$PI_DIR/extensions/"
# Skill is named browseros-neo-pi to avoid colliding with the browserclaw-managed one.
cp "$SRC/skills/browseros-neo-pi/SKILL.md" "$PI_DIR/skills/browseros-neo-pi/"

if [ "$WITH_GUIDELINES" = 1 ]; then
  if grep -q "BrowserOS" "$PI_DIR/AGENTS.md" 2>/dev/null; then
    echo "AGENTS.md already mentions BrowserOS, skipping guidelines."
  else
    cat "$SRC/guidelines/AGENTS.md" >> "$PI_DIR/AGENTS.md"
  fi
fi

echo "Installed pi-browseros-neo into $PI_DIR. Restart Pi Coding Agent to load it."
