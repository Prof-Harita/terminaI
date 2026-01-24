/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';

// Skip in CI to avoid heavy build steps during install
if (process.env.CI) {
  console.log('Skipping prepare in CI');
  process.exit(0);
}

try {
  // Equivalent to: husky && npm run bundle
  console.log('Running prepare (husky)...');
  execSync('npx husky', { stdio: 'inherit' });

  console.log('Running prepare (bundle)...');
  execSync('npm run bundle', { stdio: 'inherit' });
} catch (error) {
  console.error('Prepare script failed:', error.message);
  process.exit(1);
}
