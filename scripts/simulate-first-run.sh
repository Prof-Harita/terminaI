#!/bin/bash
# ==============================================================================
# simulate-first-run.sh
# NUCLEAR RESET: Completely wipes all TerminaI/Gemini config and credentials
# Does a fresh build and runs the app as a true first-time user
# ==============================================================================

set -e

TERMINAI_DIR="$HOME/.terminai"
TERMAI_DIR="$HOME/.termai"
GEMINI_DIR="$HOME/.gemini"
BACKUP_DIR="$HOME/.terminai-backup-$(date +%Y%m%d-%H%M%S)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔥 TerminaI NUCLEAR RESET Script"
echo "========================================"
echo "This will completely wipe ALL credentials and config."
echo ""

# Step 1: Create backup
echo "📦 Step 1: Creating backup at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"

[[ -d "${TERMINAI_DIR}" ]] && cp -r "${TERMINAI_DIR}" "${BACKUP_DIR}/terminai" && echo "   ✅ Backed up ~/.terminai"
[[ -d "${TERMAI_DIR}" ]] && cp -r "${TERMAI_DIR}" "${BACKUP_DIR}/termai" && echo "   ✅ Backed up ~/.termai"
[[ -d "${GEMINI_DIR}" ]] && cp -r "${GEMINI_DIR}" "${BACKUP_DIR}/gemini" && echo "   ✅ Backed up ~/.gemini"

echo "   📁 Backup complete: ${BACKUP_DIR}"

# Step 2: NUKE everything
echo ""
echo "💣 Step 2: Removing ALL config directories..."
rm -rf "$TERMINAI_DIR" 2>/dev/null && echo "   ✅ Removed ~/.terminai" || true
rm -rf "$TERMAI_DIR" 2>/dev/null && echo "   ✅ Removed ~/.termai" || true
rm -rf "$GEMINI_DIR" 2>/dev/null && echo "   ✅ Removed ~/.gemini" || true

# Step 3: Clean build artifacts
echo ""
echo "🧹 Step 3: Cleaning build artifacts..."
cd "$PROJECT_DIR"
rm -rf node_modules/.cache 2>/dev/null && echo "   ✅ Cleared node_modules cache" || true
rm -rf packages/*/dist 2>/dev/null && echo "   ✅ Cleared package dist folders" || true

# Step 4: Fresh install and build
echo ""
echo "🔨 Step 4: Fresh install and build..."
npm install
npm run build

# Step 5: Run the app
echo ""
echo "=========================================="
echo "✅ NUCLEAR RESET COMPLETE!"
echo ""
echo "🚀 Launching TerminaI as first-time user..."
echo "=========================================="
echo ""

npm start

# After user exits, show restore instructions
echo ""
echo "=========================================="
echo "To restore your original config:"
echo "  cp -r $BACKUP_DIR/terminai ~/.terminai"
echo "  cp -r $BACKUP_DIR/gemini ~/.gemini"
echo "=========================================="
