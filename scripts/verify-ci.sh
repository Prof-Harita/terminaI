#!/bin/bash
set -e

echo "🔹 1. Cleaning up..."
rm -rf node_modules packages/*/node_modules packages/*/dist

echo "🔹 2. Installing dependencies (npm ci)..."
npm ci

echo "🔹 3. Building project..."
npm run build

echo "🔹 4. Running FULL linting (matches CI exactly)..."
echo "   This includes: ESLint, Prettier, actionlint, shellcheck, yamllint,"
echo "   sensitive keywords, and tsconfig validation."
node scripts/lint.js

echo "🔹 4b. Verifying settings documentation is up to date..."
npm run docs:settings -- --check

echo "🔹 5. Running tests (npm run test:ci)..."
export NO_COLOR=true
npm run test:ci

echo "🔹 6. Bundling..."
npm run bundle

echo "🔹 7. Smoke testing bundle..."
node ./bundle/gemini.js --version

echo "✅ Local CI check passed! Safe to push."
