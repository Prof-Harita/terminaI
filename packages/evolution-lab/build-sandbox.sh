#!/bin/bash
# Build the Evolution Lab Docker sandbox image

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Building Evolution Lab sandbox image..."
echo "Repo root: $REPO_ROOT"

docker build \
    -t terminai/evolution-sandbox:latest \
    -f "$SCRIPT_DIR/Dockerfile" \
    "$REPO_ROOT"

echo ""
echo "✅ Image built: terminai/evolution-sandbox:latest"
echo ""
echo "To run the Evolution Lab with Docker sandbox:"
echo "  cd packages/evolution-lab"
echo "  npm run lab -- --count 100"
