/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resolves file: references in package.json dependencies to versioned npm dependencies.
 * This script is called during the release workflow to ensure published packages
 * have proper versioned dependencies instead of local file references.
 *
 * Usage: node scripts/resolve-file-deps.js <version>
 * Example: node scripts/resolve-file-deps.js 0.50.3
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Packages that are published to npm and may have file: references
const PUBLISHABLE_PACKAGES = ['cli', 'core', 'a2a-server'];

// Internal package scope - dependencies matching this are candidates for resolution
const INTERNAL_SCOPE = '@terminai/';

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function resolveFileDeps(version) {
  console.log(`Resolving file: references to version ${version}...\n`);

  let totalResolved = 0;

  for (const packageName of PUBLISHABLE_PACKAGES) {
    const packageJsonPath = resolve(
      rootDir,
      'packages',
      packageName,
      'package.json',
    );

    if (!existsSync(packageJsonPath)) {
      console.warn(`  ⚠️  Package not found: ${packageName}`);
      continue;
    }

    const packageJson = readJson(packageJsonPath);
    let resolvedInPackage = 0;

    // Process dependencies
    if (packageJson.dependencies) {
      for (const [depName, depVersion] of Object.entries(
        packageJson.dependencies,
      )) {
        if (
          depVersion.startsWith('file:') &&
          depName.startsWith(INTERNAL_SCOPE)
        ) {
          console.log(`  📦 ${packageName}: ${depName} file:... → ${version}`);
          packageJson.dependencies[depName] = version;
          resolvedInPackage++;
        }
      }
    }

    // Process devDependencies (optional - only for publishable internal deps)
    // Note: devDependencies are typically NOT included in published packages,
    // but we resolve them anyway for consistency
    if (packageJson.devDependencies) {
      for (const [depName, depVersion] of Object.entries(
        packageJson.devDependencies,
      )) {
        if (
          depVersion.startsWith('file:') &&
          depName.startsWith(INTERNAL_SCOPE)
        ) {
          // Skip test-utils as it's not published
          if (depName === '@terminai/test-utils') {
            continue;
          }
          console.log(
            `  📦 ${packageName}: ${depName} (dev) file:... → ${version}`,
          );
          packageJson.devDependencies[depName] = version;
          resolvedInPackage++;
        }
      }
    }

    if (resolvedInPackage > 0) {
      writeJson(packageJsonPath, packageJson);
      console.log(
        `  ✅ ${packageName}: Resolved ${resolvedInPackage} reference(s)\n`,
      );
      totalResolved += resolvedInPackage;
    } else {
      console.log(`  ⏭️  ${packageName}: No file: references to resolve\n`);
    }
  }

  console.log(`\n✨ Done! Resolved ${totalResolved} file: reference(s) total.`);
}

// Main
const version = process.argv[2];
if (!version) {
  console.error('Error: No version specified.');
  console.error('Usage: node scripts/resolve-file-deps.js <version>');
  process.exit(1);
}

resolveFileDeps(version);
