/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { runExitCleanup } from '../utils/cleanup.js';

export async function exitCli(exitCode = 0) {
  await runExitCleanup();
  process.exit(exitCode);
}
