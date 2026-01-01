/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

// Unset NO_COLOR environment variable to ensure consistent theme behavior between local and CI test runs
if (process.env.NO_COLOR !== undefined) {
  delete process.env.NO_COLOR;
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterAll } from 'vitest';
import { setSimulate429 } from './src/utils/testUtils.js';

const workerId = process.env.VITEST_WORKER_ID ?? '0';
const testHome = path.join(process.cwd(), `.test-home-${workerId}`);
if (!fs.existsSync(testHome)) {
  fs.mkdirSync(testHome, { recursive: true });
}
process.env.HOME = testHome;
process.env.USERPROFILE = testHome;
afterAll(() => {
  fs.rmSync(testHome, { recursive: true, force: true });
});

// Disable 429 simulation globally for all tests
setSimulate429(false);
