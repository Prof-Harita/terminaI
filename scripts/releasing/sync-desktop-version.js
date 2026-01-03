/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sync desktop tauri.conf.json version with root package.json version.
 * Ensures desktop installers report the same version as npm packages.
 *
 * Usage:
 *   node scripts/releasing/sync-desktop-version.js          # Update version
 *   node scripts/releasing/sync-desktop-version.js --check  # Validate only
 */

import fs from 'node:fs/promises';

const ROOT_PACKAGE = 'package.json';
const TAURI_CONF = 'packages/desktop/src-tauri/tauri.conf.json';

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');

  try {
    // Read root package.json version
    const rootPackageRaw = await fs.readFile(ROOT_PACKAGE, 'utf-8');
    const rootPackage = JSON.parse(rootPackageRaw);
    const targetVersion = rootPackage.version;

    if (!targetVersion) {
      console.error('Error: No version found in root package.json');
      process.exit(1);
    }

    // Read tauri.conf.json
    const tauriConfRaw = await fs.readFile(TAURI_CONF, 'utf-8');
    const tauriConf = JSON.parse(tauriConfRaw);
    const currentVersion = tauriConf.version;

    if (checkOnly) {
      // Validation mode
      if (currentVersion !== targetVersion) {
        console.error(
          `Version mismatch: tauri.conf.json=${currentVersion}, package.json=${targetVersion}`,
        );
        process.exit(1);
      }
      console.log(`✅ Desktop version aligned: ${currentVersion}`);
      return;
    }

    // Update mode
    if (currentVersion === targetVersion) {
      console.log(`Desktop version already at ${targetVersion}`);
      return;
    }

    console.log(
      `Updating desktop version: ${currentVersion} → ${targetVersion}`,
    );
    tauriConf.version = targetVersion;

    // Write back with same formatting (2-space indent)
    await fs.writeFile(TAURI_CONF, JSON.stringify(tauriConf, null, 2) + '\n');
    console.log(`✅ Updated ${TAURI_CONF} to version ${targetVersion}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
