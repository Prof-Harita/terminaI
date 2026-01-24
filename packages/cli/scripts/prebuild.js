import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[prebuild] Starting native build...');

try {
  // 1. Build
  // We run in the parent directory (packages/cli) because that's where binding.gyp is.
  const cliDir = path.join(__dirname, '..');

  // Use npx node-gyp to ensure we use the local/project version or a compatible one
  execSync('npx node-gyp rebuild', { stdio: 'inherit', cwd: cliDir });

  // 2. Distribute (Windows only)
  // On Windows, we copy the built binary to the platform-specific package so it can be published.
  if (os.platform() === 'win32') {
    const arch = os.arch();
    const source = path.join(cliDir, 'build/Release/terminai_native.node');
    // Map 'ia32' to 'x86' if needed, but we targeting x64/arm64.
    // terminai support: x64, arm64.

    // Construct target path: packages/native-win32-{arch}
    const targetDir = path.join(cliDir, `../native-win32-${arch}`);
    const target = path.join(targetDir, 'terminai_native.node');

    if (fs.existsSync(targetDir)) {
      console.log(`[prebuild] Copying binary to ${targetDir}`);
      fs.copyFileSync(source, target);
      console.log(`[prebuild] Success: ${target}`);
    } else {
      console.warn(
        `[prebuild] Target package directory ${targetDir} not found! Skipping distribution.`,
      );
    }
  } else {
    console.log(
      '[prebuild] Non-Windows platform detected. Skipping distribution to win32 packages.',
    );
  }
} catch (e) {
  console.error('[prebuild] Build failed:', e);
  process.exit(1);
}
