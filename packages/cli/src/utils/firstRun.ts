/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const ONBOARDING_COMPLETE_FILE = path.join(
  os.homedir(),
  '.termai',
  '.onboarded',
);

export function isFirstRun(): boolean {
  try {
    return !fs.existsSync(ONBOARDING_COMPLETE_FILE);
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  try {
    fs.mkdirSync(path.dirname(ONBOARDING_COMPLETE_FILE), { recursive: true });
    fs.writeFileSync(ONBOARDING_COMPLETE_FILE, new Date().toISOString());
  } catch {
    // Swallow errors so first-run does not block startup.
  }
}
