#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * pin-internal-deps.js
 *
 * Replace internal workspace dependency specifiers (`file:../...`) with the
 * exact release version for the publishable package set.
 *
 * Modes:
 *   default (mutate): Rewrite package.json files in place.
 *   --check: Fail with exit code 1 if any publishable package has `file:` deps.
 *
 * Usage:
 *   node scripts/releasing/pin-internal-deps.js           # mutate mode
 *   node scripts/releasing/pin-internal-deps.js --check   # validation mode
 *   node scripts/releasing/pin-internal-deps.js --version 1.0.0  # explicit version
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Publishable packages in dependency order
const PUBLISHABLE_PACKAGES = ['core', 'a2a-server', 'cli'];

// Internal package names that should be pinned
const INTERNAL_PACKAGE_NAMES = [
  '@terminai/core',
  '@terminai/a2a-server',
  '@terminai/cli',
];

// Dependency fields to check and rewrite
const DEP_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    check: args.includes('--check'),
    version: getArgValue(args, '--version'),
  };
}

function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return null;
}

/**
 * Get the release version from root package.json or CLI arg
 */
function getReleaseVersion(explicitVersion) {
  if (explicitVersion) {
    return explicitVersion;
  }
  const rootPkgPath = path.join(rootDir, 'package.json');
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
  return rootPkg.version;
}

/**
 * Check if a dependency value is a file: specifier
 */
function isFileDep(value) {
  return typeof value === 'string' && value.startsWith('file:');
}

/**
 * Find all file: dependencies in a package.json that point to internal packages
 */
export function findFileDeps(pkg) {
  const found = [];
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, value] of Object.entries(deps)) {
      if (isFileDep(value) && INTERNAL_PACKAGE_NAMES.includes(name)) {
        found.push({ field, name, value });
      }
    }
  }
  return found;
}

/**
 * Rewrite file: dependencies to exact version in a package.json object
 */
export function pinFileDeps(pkg, version) {
  const modified = { ...pkg };
  let changed = false;

  for (const field of DEP_FIELDS) {
    if (!modified[field]) continue;
    modified[field] = { ...modified[field] };
    for (const [name, value] of Object.entries(modified[field])) {
      if (isFileDep(value) && INTERNAL_PACKAGE_NAMES.includes(name)) {
        modified[field][name] = version;
        changed = true;
      }
    }
  }

  return { pkg: modified, changed };
}

/**
 * Main execution
 */
export function run(options = {}) {
  const args = options.args ?? parseArgs();
  const checkMode = args.check;
  const releaseVersion = getReleaseVersion(args.version);

  console.log(
    `${checkMode ? 'Checking' : 'Pinning'} internal deps to version ${releaseVersion}`,
  );

  const issues = [];

  for (const pkgName of PUBLISHABLE_PACKAGES) {
    const pkgDir = path.join(rootDir, 'packages', pkgName);
    const pkgJsonPath = path.join(pkgDir, 'package.json');

    if (!fs.existsSync(pkgJsonPath)) {
      console.warn(`⚠️  Package not found: ${pkgJsonPath}`);
      continue;
    }

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const fileDeps = findFileDeps(pkgJson);

    if (fileDeps.length > 0) {
      if (checkMode) {
        for (const dep of fileDeps) {
          issues.push({
            package: pkgName,
            field: dep.field,
            name: dep.name,
            value: dep.value,
          });
        }
      } else {
        // Mutate mode: rewrite the file
        const { pkg: pinned } = pinFileDeps(pkgJson, releaseVersion);
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pinned, null, 2) + '\n');
        console.log(
          `✅ ${pkgName}: pinned ${fileDeps.length} internal dep(s) to ${releaseVersion}`,
        );
      }
    } else {
      console.log(`✅ ${pkgName}: no file: deps found`);
    }
  }

  if (checkMode && issues.length > 0) {
    console.error('\n❌ Found file: dependencies in publishable packages:\n');
    for (const issue of issues) {
      console.error(
        `   ${issue.package}/${issue.field}/${issue.name}: ${issue.value}`,
      );
    }
    console.error(
      '\nRun `node scripts/releasing/pin-internal-deps.js` to fix before publishing.\n',
    );
    process.exit(1);
  }

  if (checkMode) {
    console.log('\n✅ All publishable packages have pinned dependencies.\n');
  }

  return { issues, releaseVersion };
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
