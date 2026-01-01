import { build } from 'esbuild';
import { join } from 'path';
import { platform, arch } from 'os';

function getTargetTriple() {
  const os = platform();
  const cpu = arch();

  // Map Node.js platform/arch to Rust target triples
  const mapping = {
    'linux-x64': 'x86_64-unknown-linux-gnu',
    'win32-x64': 'x86_64-pc-windows-msvc',
    'darwin-x64': 'x86_64-apple-darwin',
    'darwin-arm64': 'aarch64-apple-darwin',
  };

  const key = `${os}-${cpu}`;
  const target = mapping[key];

  if (!target) {
    throw new Error(
      `Unsupported platform: ${os}-${cpu}. Supported: ${Object.keys(mapping).join(', ')}`,
    );
  }

  return target;
}

function getBinaryExtension() {
  return platform() === 'win32' ? '.exe' : '';
}

console.log('Bundling CLI for Tauri resources...');

(async () => {
  try {
    await build({
      entryPoints: ['packages/cli/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      banner: {
        js: "import { createRequire as __createRequire } from 'module'; import { fileURLToPath as __fileURLToPath } from 'url'; import { dirname as __dirnameFn } from 'path'; const require = __createRequire(import.meta.url); var __filename = typeof __filename !== 'undefined' ? __filename : __fileURLToPath(import.meta.url); var __dirname = typeof __dirname !== 'undefined' ? __dirname : __dirnameFn(__filename);",
      },
      outfile: 'packages/desktop/src-tauri/resources/terminai_cli.mjs',
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
        'vscode', // common exclusion
        'electron', // just in case
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      loader: {
        '.node': 'file',
        '.wasm': 'file',
      },
      logLevel: 'info',
    });

    console.log('⚡ Bundle created successfully');

    // SEA Generation Steps
    console.log('Creating SEA binary...');
    const { execSync } = await import('node:child_process');

    // 1. Generate Blob
    execSync('node --experimental-sea-config sea-config.json', {
      stdio: 'inherit',
    });

    // 2. Prepare Bin Directory
    const { default: fs } = await import('node:fs');
    const binDir = 'packages/desktop/src-tauri/bin';
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

    // 3. Copy Node Binary
    const nodePath = process.execPath;
    const targetTriple = getTargetTriple();
    const targetBin = `${binDir}/terminai-${targetTriple}${getBinaryExtension()}`;
    console.log(`Building for target: ${targetTriple}`);
    fs.copyFileSync(nodePath, targetBin);

    // 4. Inject Blob (using npx postject)
    // Ensure postject is available or use npx
    try {
      execSync(
        `npx postject ${targetBin} NODE_SEA_BLOB packages/desktop/src-tauri/resources/terminai.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
        { stdio: 'inherit' },
      );
      console.log(`✅ Sidecar binary created at ${targetBin}`);

      // 5. Copy terminai_cli.mjs to bin for local verification (loader looks in execDir)
      fs.copyFileSync(
        'packages/desktop/src-tauri/resources/terminai_cli.mjs',
        join(binDir, 'terminai_cli.mjs'),
      );
      console.log(`✅ Copied terminai_cli.mjs to bin for verification`);
    } catch (e) {
      console.error('Failed to run postject:', e);
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Bundling failed:', e);
    process.exit(1);
  }
})();
