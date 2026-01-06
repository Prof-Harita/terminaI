#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { platform, arch } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the Rust target triple for current platform.
 */
function getTargetTriple() {
  const os = platform();
  const cpu = arch();

  if (os === 'linux' && cpu === 'x64') return 'x86_64-unknown-linux-gnu';
  if (os === 'linux' && cpu === 'arm64') return 'aarch64-unknown-linux-gnu';
  if (os === 'win32' && cpu === 'x64') return 'x86_64-pc-windows-msvc';
  if (os === 'win32' && cpu === 'arm64') return 'aarch64-pc-windows-msvc';
  if (os === 'darwin' && cpu === 'x64') return 'x86_64-apple-darwin';
  if (os === 'darwin' && cpu === 'arm64') return 'aarch64-apple-darwin';

  throw new Error(`Unsupported platform: ${os}-${cpu}`);
}

const binDir = path.join(
  __dirname,
  '..',
  'packages',
  'desktop',
  'src-tauri',
  'bin',
);
const targetTriple = getTargetTriple();
const isWindows = platform() === 'win32';
const ext = isWindows ? '.exe' : '';

// Ensure bin directory exists
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const targetBin = path.join(binDir, `terminai-cli-${targetTriple}${ext}`);

// Create a stub that invokes Node
if (isWindows) {
  // On Windows, compile the Rust shim
  const shimSource = path.join(
    __dirname,
    '..',
    'packages',
    'desktop',
    'src-tauri',
    'src',
    'dev_shim.rs',
  );

  if (!fs.existsSync(shimSource)) {
    console.error(`❌ Shim source not found at ${shimSource}`);
    process.exit(1);
  }

  console.log(`🔨 Compiling dev shim from ${shimSource}...`);
  try {
    const { execSync } = await import('node:child_process');
    execSync(`rustc "${shimSource}" -o "${targetBin}"`, { stdio: 'inherit' });
    console.log(`✅ Dev shim compiled to ${targetBin}`);
  } catch (e) {
    console.error('❌ Failed to compile shim:', e);

    // Fallback logic if rustc fails
    console.log('Falling back to node.exe copy (may cause argument issues)...');
    fs.copyFileSync(process.execPath, targetBin);

    // Create a launcher config that tells this Node instance to run our CLI
    const launcherConfig = path.join(binDir, 'dev-launcher.json');
    const cliEntryPoint = path.resolve(
      __dirname,
      '..',
      'packages',
      'cli',
      'dist',
      'index.js',
    );

    fs.writeFileSync(
      launcherConfig,
      JSON.stringify(
        {
          entry: cliEntryPoint,
          dev: true,
        },
        null,
        2,
      ),
    );
  }
} else {
  // On Unix, create a shell script wrapper
  const cliEntryPoint = path.resolve(
    __dirname,
    '..',
    'packages',
    'cli',
    'dist',
    'index.js',
  );
  const scriptContent = `#!/bin/bash
# Dev sidecar shim - forwards to CLI entry point
exec node "${cliEntryPoint}" "$@"
`;

  fs.writeFileSync(targetBin, scriptContent, { mode: 0o755 });
  console.log(`✅ Dev sidecar created at ${targetBin}`);
}

console.log('');
console.log('You can now run: npm run desktop:dev');
