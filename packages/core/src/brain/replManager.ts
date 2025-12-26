/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Manages execution of scripts in a REPL-like manner.
 */
export class REPLManager {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Executes code in the specified language asynchronously using spawn.
   */
  async execute(
    language: 'python' | 'javascript',
    code: string,
    timeout: number = REPLManager.DEFAULT_TIMEOUT,
  ): Promise<string> {
    const ext = language === 'python' ? 'py' : 'js';
    const tmpFile = path.join(
      os.tmpdir(),
      `terminai_repl_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`,
    );

    try {
      fs.writeFileSync(tmpFile, code);

      const cmd = language === 'python' ? 'python3' : 'node';
      const args = [tmpFile];

      return await new Promise((resolve, reject) => {
        const child = spawn(cmd, args);
        let stdout = '';
        let stderr = '';

        const timeoutId = setTimeout(() => {
          child.kill();
          reject(new Error(`Execution timed out after ${timeout}ms`));
        }, timeout);

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          clearTimeout(timeoutId);
          if (code === 0) {
            resolve(stdout);
          } else {
            resolve(`Exit code ${code}\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
          }
        });

        child.on('error', (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
      });
    } catch (err: unknown) {
      const error = err as Error;
      return `Error executing ${language} script: ${error.message}`;
    } finally {
      if (fs.existsSync(tmpFile)) {
        try {
          fs.unlinkSync(tmpFile);
        } catch {
          // Ignore unlink errors
        }
      }
    }
  }
}
