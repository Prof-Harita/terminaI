/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EvolutionTask, TaskResult, EvolutionLabConfig } from './types.js';
import { SandboxController, type SandboxInstance } from './sandbox.js';

/**
 * Runner - Executes TerminaI tasks inside sandboxes.
 */
export class Runner {
  private config: EvolutionLabConfig;
  private sandboxController: SandboxController;
  private activeTasks: Map<string, { task: EvolutionTask; startTime: number }> =
    new Map();

  constructor(config: EvolutionLabConfig) {
    this.config = config;
    this.sandboxController = new SandboxController(config.sandbox);
  }

  /**
   * Runs a batch of tasks with configurable parallelism.
   */
  async runBatch(
    tasks: EvolutionTask[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    const queue = [...tasks];
    let completed = 0;

    const runNext = async (): Promise<void> => {
      while (queue.length > 0) {
        const task = queue.shift()!;
        const result = await this.runTask(task);
        results.push(result);
        completed++;
        onProgress?.(completed, tasks.length);
      }
    };

    // Run in parallel with configured parallelism
    const workers = Array(Math.min(this.config.parallelism, tasks.length))
      .fill(null)
      .map(() => runNext());

    await Promise.all(workers);
    return results;
  }

  /**
   * Runs a single task.
   */
  async runTask(task: EvolutionTask): Promise<TaskResult> {
    const startTime = Date.now();
    const sessionId = randomUUID();
    let sandbox: SandboxInstance | null = null;

    try {
      // Create sandbox
      sandbox = await this.sandboxController.create();
      this.activeTasks.set(task.taskId, { task, startTime });

      // Execute TerminaI
      const timeout = (task.timeout || this.config.taskTimeout) * 1000;
      const result = await Promise.race([
        this.executeTerminaI(sandbox, task.prompt, sessionId),
        this.timeout(timeout),
      ]);

      // Extract logs
      const logFiles = await this.sandboxController.extractLogs(sandbox);
      const logPath = logFiles.length > 0 ? logFiles[0] : '';

      return {
        taskId: task.taskId,
        sessionId,
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        duration: Date.now() - startTime,
        stdout: result.stdout,
        stderr: result.stderr,
        logPath,
      };
    } catch (error) {
      return {
        taskId: task.taskId,
        sessionId,
        success: false,
        exitCode: 1,
        duration: Date.now() - startTime,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        logPath: '',
      };
    } finally {
      this.activeTasks.delete(task.taskId);
      if (sandbox) {
        await this.sandboxController.destroy(sandbox);
      }
    }
  }

  /**
   * Executes TerminaI with a prompt.
   */
  private async executeTerminaI(
    sandbox: SandboxInstance,
    prompt: string,
    sessionId: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // Priority: ENV var > local monorepo path > npx fallback
    let terminaiPath = process.env['TERMINAI_CLI_PATH'];

    if (!terminaiPath) {
      // Try to detect monorepo path
      const moduleDir = dirname(fileURLToPath(import.meta.url));
      const monorepoCliPath = resolve(moduleDir, '../../../cli/dist/index.js');

      if (existsSync(monorepoCliPath)) {
        terminaiPath = `node ${monorepoCliPath}`;
      } else {
        terminaiPath = 'npx terminai';
      }
    }

    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/`/g, '\\`');

    return this.sandboxController.exec(sandbox, 'sh', [
      '-c',
      `${terminaiPath} "${escapedPrompt}" --session-id ${sessionId} 2>&1`,
    ]);
  }

  /**
   * Returns a timeout rejection.
   */
  private timeout(
    ms: number,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Task timeout exceeded')), ms),
    );
  }

  /**
   * Gets active task count.
   */
  getActiveCount(): number {
    return this.activeTasks.size;
  }

  /**
   * Stops all active tasks and destroys sandboxes.
   */
  async stopAll(): Promise<void> {
    await this.sandboxController.destroyAll();
    this.activeTasks.clear();
  }
}
