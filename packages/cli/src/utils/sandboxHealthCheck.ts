/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { debugLogger } from '@terminai/core';

const execAsync = promisify(exec);

export interface HealthCheckOptions {
  timeoutMs?: number; // Default: 10000
  skipOnTimeout?: boolean; // Default: false
}

export async function runSandboxHealthCheck(
  sandboxCommand: string,
  image: string,
  options: HealthCheckOptions = {},
): Promise<{ success: boolean; error?: string; timedOut?: boolean }> {
  const { timeoutMs = 10000, skipOnTimeout = false } = options;
  debugLogger.log(`Running sandbox health check for image: ${image}`);

  const checks = [
    // Check T-APTS (primary)
    `python3 -c "import terminai_apts; print('T-APTS OK')"`,
    // Check legacy apts shim (backward compat)
    `python3 -c "from apts.model import ObjectTableLabels; assert hasattr(ObjectTableLabels,'TRANSIT'), 'Missing TRANSIT'"`,
  ];

  for (const check of checks) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fullCommand = `${sandboxCommand} run --rm ${image} ${check}`;
      debugLogger.debug(`Executing health check: ${fullCommand}`);
      await execAsync(fullCommand, { signal: controller.signal });
    } catch (error: unknown) {
      const isAbortError =
        error instanceof Error &&
        (error.name === 'AbortError' ||
          ('signal' in error &&
            (error as { signal: string }).signal === 'SIGTERM'));

      if (isAbortError) {
        debugLogger.error(`Health check timed out: ${check}`);
        if (skipOnTimeout) {
          continue;
        }
        return {
          success: false,
          timedOut: true,
          error: `Sandbox health check timed out after ${timeoutMs}ms.`,
        };
      }

      const message =
        error instanceof Error
          ? (error as { stderr?: string }).stderr || error.message
          : String(error);
      debugLogger.error(`Health check failed: ${check}`, message);
      return {
        success: false,
        error: `Sandbox health check failed: ${message}.
This indicates a sandbox image incompatibility. Please update to the latest image.`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { success: true };
}
