/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  spawn,
  type SpawnOptions,
  type ChildProcess,
} from 'node:child_process';
import { isNodeError } from './errors.js';

export class SpawnError extends Error {
  constructor(
    message: string,
    readonly code?: string | number | null,
  ) {
    super(message);
    this.name = 'SpawnError';
  }
}

export class ProcessOutputError extends SpawnError {
  constructor(
    message: string,
    readonly stdout: string,
    readonly stderr: string,
    code?: string | number | null,
  ) {
    super(message, code);
    this.name = 'ProcessOutputError';
  }
}

/**
 * Safely spawns a child process with error handling for startup failures.
 *
 * Unlike node:child_process.spawn, this returns a Promise that resolves to the
 * ChildProcess instance ONLY after we confirm it has successfully started.
 * It catches immediate 'error' events (like ENOENT) and rejects the promise.
 *
 * @param command The command to run
 * @param args Arguments for the command
 * @param options Spawn options
 * @returns Promise resolving to the running ChildProcess
 */
export function safeSpawn(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    let spawned = false;

    try {
      const child = spawn(command, args, options);

      const errorHandler = (err: Error) => {
        if (!spawned) {
          spawned = true; // Prevent double-resolution
          reject(
            new SpawnError(
              `Failed to spawn '${command}': ${err.message}`,
              isNodeError(err) ? err.code : undefined,
            ),
          );
        }
      };

      child.on('error', errorHandler);

      // If the process spawns successfully, we can resolve.
      // There isn't a specific 'spawned' event in older Node versions,
      // but 'spawn' event exists in Node 15+.
      // For broad compatibility, we use a nextTick/setImmediate check
      // or rely on the fact that 'error' emits synchronously for ENOENT often.
      // A robust way for long-running processes is to wait a tick.
      process.nextTick(() => {
        if (!spawned) {
          spawned = true;
          // Clean up the boot-time error handler so the caller can attach their own
          child.removeListener('error', errorHandler);
          resolve(child);
        }
      });
    } catch (err) {
      reject(
        new SpawnError(
          `Synchronous error spawning '${command}': ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  });
}

/**
 * Configuration for collecting process output.
 */
export interface OutputOptions extends SpawnOptions {
  /** Maximum number of bytes to capture for stdout/stderr combined. Default 1MB. */
  maxBuffer?: number;
  /** Whether to strip ANSI codes from output. Default false. */
  stripAnsi?: boolean;
}

/**
 * Spawns a process and buffers its output up to a limit.
 * Resolves with stdout string. Rejects if exit code != 0.
 */
export async function spawnWithOutput(
  command: string,
  args: string[] = [],
  options: OutputOptions = {},
): Promise<string> {
  const maxBuffer = options.maxBuffer ?? 1024 * 1024; // 1MB default

  const child = await safeSpawn(command, args, {
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let size = 0;
    const encoding = 'utf8';
    let truncated = false;

    if (child.stdout) {
      child.stdout.setEncoding(encoding);
      child.stdout.on('data', (chunk: string) => {
        if (truncated) return;
        const len = Buffer.byteLength(chunk);
        if (size + len > maxBuffer) {
          truncated = true;
          stdout += chunk.substring(0, maxBuffer - size) + '\n...[TRUNCATED]';
          child.kill(); // Stop consuming resource
        } else {
          stdout += chunk;
          size += len;
        }
      });
    }

    if (child.stderr) {
      child.stderr.setEncoding(encoding);
      child.stderr.on('data', (chunk: string) => {
        if (truncated) return;
        // checking size limit shared or separate? Let's share for safety.
        const len = Buffer.byteLength(chunk);
        if (size + len > maxBuffer) {
          truncated = true;
          stderr += chunk.substring(0, maxBuffer - size) + '\n...[TRUNCATED]';
        } else {
          stderr += chunk;
          size += len;
        }
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new ProcessOutputError(
            `Command '${command}' failed with code ${code}`,
            stdout.trim(),
            stderr.trim(),
            code,
          ),
        );
      }
    });

    child.on('error', (err) => {
      reject(new SpawnError(err.message));
    });
  });
}
