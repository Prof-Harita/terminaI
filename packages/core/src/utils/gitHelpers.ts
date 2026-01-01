/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Checks if a file is tracked by git in the current workspace.
 * Uses `git ls-files --error-unmatch` to check tracking status.
 */
export function isGitTracked(filePath: string, cwd?: string): boolean {
  try {
    const targetPath = path.resolve(filePath);

    // Ensure file exists before checking git
    if (!fs.existsSync(targetPath)) {
      return false;
    }

    const workingDir = cwd || path.dirname(targetPath);

    execSync(`git ls-files --error-unmatch "${targetPath}"`, {
      cwd: workingDir,
      stdio: 'ignore',
      timeout: 1000,
    });
    return true;
  } catch {
    return false;
  }
}
