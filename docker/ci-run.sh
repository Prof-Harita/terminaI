#!/bin/bash
set -e

# Build the image
echo "Building CI image..."
docker build -f docker/Dockerfile.ci -t terminai-ci .

# Run the container
echo "Running preflight in container..."
docker run --rm \
  -v "$(pwd):/app" \
  -w /app \
  terminai-ci \
  bash -c "npm ci && npm run preflight"
