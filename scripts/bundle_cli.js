/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { build } from 'esbuild';
import { platform, arch } from 'node:os';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { wasmLoader } from 'esbuild-plugin-wasm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function createWasmPlugins() {
  const wasmBinaryPlugin = {
    name: 'wasm-binary',
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /\.wasm\?binary$/ }, (args) => {
        const specifier = args.path.replace(/\?binary$/, '');
        const resolveDir = args.resolveDir || '';
        const isBareSpecifier =
          !path.isAbsolute(specifier) &&
          !specifier.startsWith('./') &&
          !specifier.startsWith('../');

        let resolvedPath;
        if (isBareSpecifier) {
          resolvedPath = require.resolve(specifier, {
            paths: resolveDir ? [resolveDir, __dirname] : [__dirname],
          });
        } else {
          resolvedPath = path.isAbsolute(specifier)
            ? specifier
            : path.join(resolveDir, specifier);
        }

        return { path: resolvedPath, namespace: 'wasm-embedded' };
      });
    },
  };

  return [wasmBinaryPlugin, wasmLoader({ mode: 'embedded' })];
}


/**
 * Get binary extension for current platform.
 */
function getBinaryExtension() {
  return platform() === 'win32' ? '.exe' : '';
}

/**
 * Get the Rust target triple for current platform.
 * Tauri's externalBin requires binaries named with the target triple suffix.
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

console.log('📦 Bundling CLI for Tauri sidecar...');

(async () => {
  try {
    // Step 1: Bundle CLI to a single CJS file (SEA requires CJS for reliable embedding)
    const bundleOutput =
      'packages/desktop/src-tauri/resources/terminai_cli.mjs';

    await build({
      entryPoints: ['packages/cli/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: bundleOutput,
      banner: {
        js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url); globalThis.__filename = require('url').fileURLToPath(import.meta.url); globalThis.__dirname = require('path').dirname(globalThis.__filename);`,
      },
      plugins: createWasmPlugins(),
      external: [
        'serialport',
        'sqlite3',
        'better-sqlite3',
        'node-pty',
        '@lydell/node-pty',
        '@lydell/node-pty-darwin-arm64',
        '@lydell/node-pty-darwin-x64',
        '@lydell/node-pty-linux-x64',
        '@lydell/node-pty-win32-arm64',
        '@lydell/node-pty-win32-x64',
        'fsevents',
        'vscode',
        'electron',
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      loader: {
        '.node': 'file',
      },
      logLevel: 'info',
    });

    console.log('⚡ Bundle created successfully');

    // Step 2: Generate SEA blob
    console.log('🔧 Generating SEA blob...');
    execSync('node --experimental-sea-config sea-config.json', {
      stdio: 'inherit',
    });

    // Step 3: Prepare bin directory
    const binDir = 'packages/desktop/src-tauri/bin';
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Step 4: Copy Node binary with correct Tauri naming convention (terminai-cli-{target-triple})
    const nodePath = process.execPath;
    const ext = getBinaryExtension();
    const targetTriple = getTargetTriple();
    const targetBin = `${binDir}/terminai-cli-${targetTriple}${ext}`;

    console.log(`📋 Copying Node binary to ${targetBin}...`);
    fs.copyFileSync(nodePath, targetBin);

    // Step 5: Inject SEA blob
    console.log('💉 Injecting SEA blob...');
    execSync(
      `npx postject ${targetBin} NODE_SEA_BLOB packages/desktop/src-tauri/resources/terminai.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
      { stdio: 'inherit' },
    );

    console.log(`✅ Sidecar binary created at ${targetBin}`);

    // Step 6: Verify sidecar is executable
    console.log('🧪 Verifying sidecar...');
    try {
      const result = execSync(`${targetBin} --version`, {
        encoding: 'utf-8',
        timeout: 10000,
      });
      console.log(`✅ Sidecar verified: ${result.trim()}`);
    } catch (_verifyError) {
      console.error(
        '⚠️  Sidecar verification failed (may need resources for full functionality)',
      );
      if (process.env.CI) {
        process.exit(1);
      }
    }
  } catch (e) {
    console.error('❌ Bundling failed:', e);
    process.exit(1);
  }
})();
