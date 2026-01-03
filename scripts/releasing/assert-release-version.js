#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * assert-release-version.js
 *
 * Validate that the git tag version matches root package.json version,
 * and all publishable workspace versions match the root version.
 *
 * Usage:
 *   node scripts/releasing/assert-release-version.js --tag v1.0.0
 *   node scripts/releasing/assert-release-version.js  # no-tag mode (CI version check only)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Publishable packages to validate
const PUBLISHABLE_PACKAGES = ['core', 'a2a-server', 'cli'];

// Valid tag pattern: vX.Y.Z or vX.Y.Z-prerelease
const TAG_PATTERN = /^v(\d+\.\d+\.\d+(?:-.+)?)$/;

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    tag: getArgValue(args, '--tag'),
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
 * Extract version from tag (e.g., "v1.0.0" -> "1.0.0")
 */
export function extractVersionFromTag(tag) {
  const match = tag.match(TAG_PATTERN);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Get version from a package.json file
 */
function getPackageVersion(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}

/**
 * Main validation logic
 */
export function assertVersions(options = {}) {
  const args = options.args ?? parseArgs();
  const tag = args.tag;
  const errors = [];

  // Get root version
  const rootPkgPath = path.join(rootDir, 'package.json');
  const rootVersion = getPackageVersion(rootPkgPath);
  console.log(`Root package.json version: ${rootVersion}`);

  // If tag provided, validate tag format and match to root
  if (tag) {
    console.log(`Validating tag: ${tag}`);

    const tagVersion = extractVersionFromTag(tag);
    if (!tagVersion) {
      errors.push(
        `Invalid tag format: "${tag}". Expected format: vX.Y.Z or vX.Y.Z-prerelease`,
      );
    } else if (tagVersion !== rootVersion) {
      errors.push(
        `Tag version mismatch: tag "${tag}" (${tagVersion}) != root package.json (${rootVersion})`,
      );
    } else {
      console.log(`✅ Tag ${tag} matches root version ${rootVersion}`);
    }
  }

  // Validate all publishable workspaces match root version
  console.log('\nValidating workspace versions...');
  for (const pkgName of PUBLISHABLE_PACKAGES) {
    const pkgPath = path.join(rootDir, 'packages', pkgName, 'package.json');

    if (!fs.existsSync(pkgPath)) {
      errors.push(`Package not found: packages/${pkgName}/package.json`);
      continue;
    }

    const pkgVersion = getPackageVersion(pkgPath);

    if (pkgVersion !== rootVersion) {
      errors.push(
        `Version mismatch: @terminai/${pkgName} (${pkgVersion}) != root (${rootVersion})`,
      );
    } else {
      console.log(`✅ @terminai/${pkgName}: ${pkgVersion}`);
    }
  }

  // Report errors
  if (errors.length > 0) {
    console.error('\n❌ Version validation failed:\n');
    for (const error of errors) {
      console.error(`   • ${error}`);
    }
    console.error(
      '\nEnsure all publishable package versions match before releasing.\n',
    );
    process.exit(1);
  }

  console.log('\n✅ All version checks passed.\n');
  return { rootVersion, tag };
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assertVersions();
}
