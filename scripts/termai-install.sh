#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="${TERMAI_PACKAGE:-termai}"
DRY_RUN=false
ALIAS_GEMINI=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    --alias-gemini)
      ALIAS_GEMINI=true
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js >= 20 and rerun." >&2
  exit 1
fi

node_major=$(node -p "process.versions.node.split('.')[0]")
if [ "$node_major" -lt 20 ]; then
  echo "Node.js >= 20 is required. Current: $(node -v)" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install npm and rerun." >&2
  exit 1
fi

if [ "$DRY_RUN" = true ]; then
  echo "Would run: npm install -g ${PACKAGE_NAME}"
  if [ "$ALIAS_GEMINI" = true ]; then
    echo "Would add alias: gemini=termai"
  fi
  exit 0
fi

npm install -g "${PACKAGE_NAME}"

echo "TerminaI installed. Run: termai"

if [ "$ALIAS_GEMINI" = true ]; then
  shell_name=$(basename "${SHELL:-}")
  rc_file=""
  case "$shell_name" in
    zsh)
      rc_file="$HOME/.zshrc"
      ;;
    bash)
      rc_file="$HOME/.bashrc"
      ;;
    fish)
      rc_file="$HOME/.config/fish/config.fish"
      ;;
  esac

  if [ -z "$rc_file" ]; then
    echo "Could not detect a supported shell for alias setup." >&2
    echo "Add this manually: alias gemini=termai" >&2
    exit 0
  fi

  if ! grep -q "alias gemini=termai" "$rc_file" 2>/dev/null; then
    echo "alias gemini=termai" >> "$rc_file"
    echo "Added alias to $rc_file. Restart your shell to apply."
  else
    echo "Alias already present in $rc_file."
  fi
fi

echo "Next: run 'termai' and authenticate when prompted."
