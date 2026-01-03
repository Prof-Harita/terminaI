/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');

function copyFileIfMissing(sourcePath, destPath, fileName) {
  // Don't overwrite existing package-specific files
  if (fs.existsSync(destPath)) {
    console.log(`  Skipped ${fileName} (package-specific file exists)`);
    return;
  }
  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`  Copied ${fileName}`);
  } catch (err) {
    console.error(`Error copying ${fileName}:`, err);
    process.exit(1);
  }
}

function preparePackage(packageName) {
  const packageDir = path.resolve(rootDir, 'packages', packageName);
  if (!fs.existsSync(packageDir)) {
    console.error(`Error: Package directory not found at ${packageDir}`);
    process.exit(1);
  }

  console.log(`Preparing package: ${packageName}`);

  // Always copy LICENSE (required for publishing)
  const licenseDest = path.resolve(packageDir, 'LICENSE');
  fs.copyFileSync(path.resolve(rootDir, 'LICENSE'), licenseDest);
  console.log(`  Copied LICENSE`);

  // Copy README only if package doesn't have its own
  const readmeDest = path.resolve(packageDir, 'README.md');
  copyFileIfMissing(
    path.resolve(rootDir, 'README.md'),
    readmeDest,
    'README.md',
  );
}

// Prepare all publishable packages (no .npmrc - do not ship registry overrides)
preparePackage('core');
preparePackage('a2a-server');
preparePackage('cli');

console.log('Successfully prepared all packages.');
