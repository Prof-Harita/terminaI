/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import lintStaged from 'lint-staged';

try {
  // Get repository root
  const root = execSync('git rev-parse --show-toplevel').toString().trim();

  // Run critical tests first
  try {
    console.log('Running risk checks (CI Prevention)...');
    execSync('node scripts/check-precommit-risks.js', { stdio: 'inherit' });

    console.log('Running critical tests...');
    execSync(
      'npm run test --workspace @terminai/cli -- src/config/policy-engine.integration.test.ts src/utils/installationInfo.test.ts src/gemini.test.tsx',
      { stdio: 'inherit' },
    );
  } catch (_error) {
    console.error('Critical tests failed. Commit aborted.');
    process.exit(1);
  }

  // Run lint-staged with API directly
  const passed = await lintStaged({ cwd: root });

  // Exit with appropriate code
  process.exit(passed ? 0 : 1);
} catch (error) {
  // Exit with error code
  console.error(error);
  process.exit(1);
}
