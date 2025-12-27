/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SandboxController, type SandboxExecResult } from './sandbox.js';
import { DEFAULT_CONFIG, type SandboxConfig } from './types.js';

export type ExpectedExit = 'zero' | 'nonzero' | number | undefined;

export interface SuiteTaskDefinition {
  id: string;
  description: string;
  command: string;
  args: string[];
  expect?: ExpectedExit;
  maxStdout?: number;
  expectTruncated?: boolean;
}

export interface SuiteResult {
  taskId: string;
  passed: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  truncated?: boolean;
  notes: string[];
}

const DEFAULT_SUITE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../tasks/suite.json',
);

export async function loadSuiteDefinitions(
  suitePath: string = DEFAULT_SUITE_PATH,
): Promise<SuiteTaskDefinition[]> {
  const raw = await readFile(suitePath, 'utf-8');
  return JSON.parse(raw) as SuiteTaskDefinition[];
}

export function evaluateSuiteTask(
  task: SuiteTaskDefinition,
  result: SandboxExecResult,
): SuiteResult {
  const notes: string[] = [];
  let passed = true;

  if (task.expect === 'zero' && result.exitCode !== 0) {
    passed = false;
    notes.push(`Expected exit code 0, got ${result.exitCode}`);
  } else if (task.expect === 'nonzero' && result.exitCode === 0) {
    passed = false;
    notes.push('Expected non-zero exit code');
  } else if (
    typeof task.expect === 'number' &&
    result.exitCode !== task.expect
  ) {
    passed = false;
    notes.push(`Expected exit code ${task.expect}, got ${result.exitCode}`);
  }

  if (task.maxStdout && result.stdout.length > task.maxStdout) {
    passed = false;
    notes.push(
      `stdout exceeded limit (${result.stdout.length}/${task.maxStdout})`,
    );
  }

  if (task.expectTruncated && !result.truncated) {
    passed = false;
    notes.push('Expected stdout to be truncated');
  }

  return {
    taskId: task.id,
    passed,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    truncated: result.truncated,
    notes,
  };
}

export interface SuiteOptions {
  tasks?: SuiteTaskDefinition[];
  count?: number;
  parallelism?: number;
  sandboxConfig?: Partial<SandboxConfig>;
}

export async function runSuite(options: SuiteOptions = {}): Promise<SuiteResult[]> {
  const definitions =
    options.tasks?.length && options.tasks.length > 0
      ? options.tasks
      : await loadSuiteDefinitions();

  const selectedCount =
    options.count && options.count > 0
      ? Math.min(options.count, definitions.length)
      : definitions.length;
  const tasks = definitions.slice(0, selectedCount);

  const parallelism = Math.max(options.parallelism ?? 1, 1);
  const sandboxConfig: SandboxConfig = {
    ...DEFAULT_CONFIG.sandbox,
    networkDisabled: options.sandboxConfig?.networkDisabled ?? true,
    outputLimitBytes: options.sandboxConfig?.outputLimitBytes ?? 65536,
    ...options.sandboxConfig,
  };

  const controller = new SandboxController(sandboxConfig);
  const results: SuiteResult[] = [];
  const queue = [...tasks];

  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) break;

      let sandbox = null;
      try {
        sandbox = await controller.create();
        const execResult = await controller.exec(
          sandbox,
          task.command,
          task.args,
        );
        results.push(evaluateSuiteTask(task, execResult));
      } catch (error) {
        results.push({
          taskId: task.id,
          passed: false,
          exitCode: 1,
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
          truncated: false,
          notes: ['Suite task failed to execute'],
        });
      } finally {
        if (sandbox) {
          await controller.destroy(sandbox);
        }
      }
    }
  };

  const workers = Array(Math.min(parallelism, tasks.length))
    .fill(null)
    .map(() => worker());
  await Promise.all(workers);
  await controller.destroyAll();
  return results;
}
