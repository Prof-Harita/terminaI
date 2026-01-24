/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import path from 'node:path';

// Configuration
const FORBIDDEN_EXTENSIONS = new Set([
  '.node',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.o',
  '.obj',
  '.lib',
  '.a',
]);

const FORBIDDEN_PATH_REGEX = /^packages\/.*\/(build|\.venv|node_modules)\//;

const ALLOWLIST = new Set([
  // Add legitimate binaries here if absolutely necessary (try to avoid this)
]);

function getFilesToCheck() {
  // If in a PR, we might only want to check the diff, but for safety we check all files
  // tracked by git to catch anything that slipped in.
  // Using git ls-files is robust for "what is in the repo now".
  try {
    const output = execSync('git ls-files', {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return output.split('\n').filter((f) => f.trim() !== '');
  } catch (err) {
    console.error('Failed to run git ls-files:', err);
    process.exit(1);
  }
}

function checkFiles() {
  const files = getFilesToCheck();
  const errors = [];

  for (const file of files) {
    if (ALLOWLIST.has(file)) continue;

    const ext = path.extname(file).toLowerCase();

    // Check extension
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      errors.push(`Forbidden extension (${ext}): ${file}`);
      continue; // No need to check path if extension failed
    }

    // Check path patterns
    if (FORBIDDEN_PATH_REGEX.test(file)) {
      errors.push(`Forbidden path structure: ${file}`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Forbidden artifacts detected in repository:');
    errors.forEach((e) => console.error(`   - ${e}`));
    console.error('\nRemediation:');
    console.error('   git rm --cached <file>');
    console.error('   And add to .gitignore');
    process.exit(1);
  } else {
    console.log('✅ No forbidden artifacts found.');
  }
}

checkFiles();
