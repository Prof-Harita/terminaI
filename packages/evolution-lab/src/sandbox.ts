/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { SandboxConfig, SandboxType } from './types.js';

/**
 * Sandbox instance representing a running environment.
 */
export interface SandboxInstance {
  id: string;
  type: SandboxType;
  containerId?: string;
  workDir: string;
  logsDir: string;
  ready: boolean;
}

/**
 * Sandbox Controller - Manages ephemeral execution environments.
 */
export class SandboxController {
  private config: SandboxConfig;
  private activeSandboxes: Map<string, SandboxInstance> = new Map();

  constructor(config?: Partial<SandboxConfig>) {
    this.config = {
      type: 'headless',
      image: 'terminai/evolution-sandbox:latest',
      timeout: 600,
      ...config,
    };
  }

  /**
   * Creates a new sandbox instance.
   */
  async create(): Promise<SandboxInstance> {
    const id = randomUUID();
    const workDir = path.join('/tmp', 'evolution-lab', id);
    const logsDir = path.join(workDir, 'logs');

    await fs.mkdir(workDir, { recursive: true });
    await fs.mkdir(logsDir, { recursive: true });

    const instance: SandboxInstance = {
      id,
      type: this.config.type,
      workDir,
      logsDir,
      ready: false,
    };

    if (this.config.type === 'host') {
      // Host mode runs directly on the machine (unsafe by default).
      instance.ready = true;
    } else {
      // Docker-based sandbox (headless/desktop/full-vm defaults).
      const containerId = await this.startDockerContainer(id, workDir);
      instance.containerId = containerId;
      instance.ready = true;
    }

    this.activeSandboxes.set(id, instance);
    return instance;
  }

  /**
   * Starts a Docker container for sandbox execution.
   */
  private async startDockerContainer(
    id: string,
    workDir: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        'run',
        '-d',
        '--rm',
        '--name',
        `evolution-${id.slice(0, 8)}`,
        '-v',
        `${workDir}:/workspace`,
        '-w',
        '/workspace',
        '--memory',
        `${this.config.memoryLimit || 512}m`,
        this.config.image,
        'sleep',
        `${this.config.timeout}`,
      ];

      const proc = spawn('docker', args);
      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Docker failed: ${stderr}`));
        }
      });
    });
  }

  /**
   * Executes a command inside the sandbox.
   */
  async exec(
    sandbox: SandboxInstance,
    command: string,
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      let proc: ChildProcess;

      if (sandbox.containerId) {
        // Docker exec
        proc = spawn('docker', ['exec', sandbox.containerId, command, ...args]);
      } else {
        // Direct execution with working directory
        proc = spawn(command, args, {
          cwd: sandbox.workDir,
          env: {
            ...process.env,
            HOME: sandbox.workDir,
            TERMINAI_LOGS_DIR: sandbox.logsDir,
          },
        });
      }

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
        });
      });

      proc.on('error', (err) => {
        resolve({
          stdout,
          stderr: err.message,
          exitCode: 1,
        });
      });
    });
  }

  /**
   * Extracts logs from the sandbox.
   */
  async extractLogs(sandbox: SandboxInstance): Promise<string[]> {
    try {
      const files = await fs.readdir(sandbox.logsDir);
      return files.filter((f) => f.endsWith('.jsonl'));
    } catch {
      return [];
    }
  }

  /**
   * Destroys a sandbox instance.
   */
  async destroy(sandbox: SandboxInstance): Promise<void> {
    if (sandbox.containerId) {
      await new Promise<void>((resolve) => {
        const proc = spawn('docker', ['stop', sandbox.containerId!]);
        proc.on('close', () => resolve());
      });
    }

    try {
      await fs.rm(sandbox.workDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    this.activeSandboxes.delete(sandbox.id);
  }

  /**
   * Destroys all active sandboxes.
   */
  async destroyAll(): Promise<void> {
    const sandboxes = Array.from(this.activeSandboxes.values());
    await Promise.all(sandboxes.map((s) => this.destroy(s)));
  }

  /**
   * Gets active sandbox count.
   */
  getActiveCount(): number {
    return this.activeSandboxes.size;
  }
}
