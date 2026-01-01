#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unified build script for TerminaI Desktop releases
 *
 * This script orchestrates the entire build pipeline:
 * 1. Build frontend (React/Vite)
 * 2. Bundle CLI as SEA
 * 3. Copy web UI to Tauri resources
 * 4. Build Tauri installers
 *
 * Usage: node scripts/build-release.js
 */

import { execSync } from 'node:child_process';
import { platform, arch } from 'node:os';
import { existsSync } from 'node:fs';

console.log('═══════════════════════════════════════════════════════');
console.log('🚀 TerminaI Release Build');
console.log(`   Platform: ${platform()}-${arch()}`);
console.log(`   Node: ${process.version}`);
console.log('═══════════════════════════════════════════════════════\n');

function step(name, command, cwd = '.') {
  console.log(`\n📦 Step: ${name}`);
  console.log(`   Command: ${command}`);
  console.log(`   Dir: ${cwd}`);
  console.log('───────────────────────────────────────────────────────');

  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    console.log(`✅ ${name} completed\n`);
  } catch (e) {
    console.error(`❌ ${name} failed`);
    process.exit(1);
  }
}

// Validate we're in repo root
if (!existsSync('packages/cli') || !existsSync('packages/desktop')) {
  console.error('❌ Error: Must run from repository root');
  console.error('   Expected: packages/cli and packages/desktop to exist');
  process.exit(1);
}

// Step 1: Build Frontend
step('Build Frontend (Vite)', 'npm run build', 'packages/desktop');

// Step 2: Bundle CLI Sidecar
step('Bundle CLI as SEA', 'node scripts/bundle_cli.js', '.');

// Step 3: Copy Web UI to Resources
step(
  'Copy Web UI to Tauri Resources',
  'node scripts/bundle-web-ui.js',
  'packages/desktop',
);

// Step 4: Build Tauri
const tauriCmd = platform() === 'win32' ? 'npm.cmd' : 'npm';
step(
  'Build Tauri Installers',
  `${tauriCmd} run tauri build`,
  'packages/desktop',
);

console.log('═══════════════════════════════════════════════════════');
console.log('✅ RELEASE BUILD COMPLETE');
console.log('═══════════════════════════════════════════════════════');
console.log('\n📦 Installers located in:');
console.log('   packages/desktop/src-tauri/target/release/bundle/\n');
console.log('Next steps:');
console.log('  1. Test the installer on a clean VM');
console.log('  2. Verify app launches and connects to backend');
console.log('  3. Upload to GitHub Releases or distribution server');
console.log('═══════════════════════════════════════════════════════\n');
