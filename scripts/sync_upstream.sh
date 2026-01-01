#!/bin/bash
set -e

# Syncs this fork with the upstream google-gemini/gemini-cli repository

echo "🔄 Fetching upstream changes..."
git fetch upstream

echo "🔀 Merging upstream/main into main..."
git checkout main
git merge upstream/main

echo "⬆️  Pushing updated main to origin..."
git push origin main

echo "✅ Sync complete! Your fork is up to date with Google's main branch."
