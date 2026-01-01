/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { debugLogger, type Config, Storage } from '@terminai/core';

/**
 * Prunes session logs older than the configured retention period.
 */
export async function cleanupOldLogs(config: Config): Promise<void> {
  try {
    const logsDir = Storage.getGlobalLogsDir();
    const retentionDays = config.getLogsRetentionDays();
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const cutoff = now - retentionMs;

    let entries: string[] = [];
    try {
      entries = await fs.readdir(logsDir);
    } catch {
      // Directory might not exist yet if no logs have been written
      return;
    }

    let deletedCount = 0;
    for (const entry of entries) {
      if (!entry.endsWith('.jsonl')) continue;

      const filePath = path.join(logsDir, entry);
      const stats = await fs.stat(filePath);

      if (stats.mtimeMs < cutoff) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }

    if (deletedCount > 0 && config.getDebugMode()) {
      debugLogger.debug(`Pruned ${deletedCount} old session logs.`);
    }
  } catch (error) {
    debugLogger.error(`Failed to cleanup old logs: ${error}`);
  }
}
