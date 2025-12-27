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

export interface SandboxExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  truncated?: boolean;
}

/**
 * Sandbox Controller - Manages ephemeral execution environments.
 */
export class SandboxController {
  private config: SandboxConfig;
  private activeSandboxes: Map<string, SandboxInstance> = new Map();
  private readonly spawnFn: typeof spawn;

  constructor(config?: Partial<SandboxConfig>) {
    const normalizedType = normalizeSandboxType(
      (config?.type ?? 'docker') as string,
    );
    const baseConfig = {
      image: 'terminai/evolution-sandbox:latest',
      timeout: 600,
      memoryLimit: 512,
      cpuLimit: 1,
      networkDisabled: true,
      outputLimitBytes: 512 * 1024,
      pidsLimit: 256,
      ...config,
    };
    this.config = {
      ...baseConfig,
      type: normalizedType,
    };
    this.spawnFn = this.config.spawnFn ?? spawn;
  }

  /**
   * Creates a new sandbox instance.
   */
  async create(): Promise<SandboxInstance> {
    const id = randomUUID();
    if (this.config.type === 'host' && !this.config.allowUnsafeHost) {
      throw new Error(
        'Host sandbox is unsafe and requires --allow-unsafe-host.',
      );
    }
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
      // Docker-based sandbox (docker/desktop/full-vm defaults).
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
      const memoryLimit = this.config.memoryLimit || 512;
      const cpuLimit = this.config.cpuLimit || 1;
      const pidsLimit = this.config.pidsLimit || 256;
      const tmpfsSize = 128; // MB
      const networkMode =
        this.config.networkDisabled === false ? 'bridge' : 'none';

      const args = [
        'run',
        '-d',
        '--rm',
        '--name',
        `evolution-${id.slice(0, 8)}`,
        '--network',
        networkMode,
        '--cpus',
        `${cpuLimit}`,
        '--memory',
        `${memoryLimit}m`,
        '--pids-limit',
        `${pidsLimit}`,
        '--mount',
        `type=bind,src=${workDir},target=/workspace,rw`,
        '--workdir',
        '/workspace',
        '--tmpfs',
        `/tmp:rw,size=${tmpfsSize}m`,
        '--security-opt',
        'no-new-privileges',
        this.config.image,
        'sleep',
        `${this.config.timeout}`,
      ];

      const proc = this.spawnFn('docker', args);
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
  ): Promise<SandboxExecResult> {
    return new Promise((resolve) => {
      let proc: ChildProcess;
      const outputLimit = this.config.outputLimitBytes ?? 512 * 1024;
      let truncated = false;

      const boundedAppend = (buffer: string, chunk: string): string => {
        if (buffer.length >= outputLimit) {
          truncated = true;
          return buffer;
        }
        const available = outputLimit - buffer.length;
        if (chunk.length > available) {
          truncated = true;
        }
        return buffer + chunk.slice(0, available);
      };

      if (sandbox.containerId) {
        // Docker exec
        const dockerArgs = [
          'exec',
          '--workdir',
          '/workspace',
          '-e',
          `HOME=/workspace`,
          '-e',
          `TERMINAI_LOGS_DIR=${sandbox.logsDir}`,
          sandbox.containerId,
          command,
          ...args,
        ];
        proc = this.spawnFn('docker', dockerArgs);
      } else {
        // Direct execution with working directory
        proc = this.spawnFn(command, args, {
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
        stdout = boundedAppend(stdout, data.toString());
      });
      proc.stderr?.on('data', (data) => {
        stderr = boundedAppend(stderr, data.toString());
      });

      proc.on('close', (code) => {
        if (truncated) {
          stdout = `${stdout}\n[output truncated]\n`;
        }
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
          truncated,
        });
      });

      proc.on('error', (err) => {
        resolve({
          stdout,
          stderr: err.message,
          exitCode: 1,
          truncated,
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
        const proc = this.spawnFn('docker', ['stop', sandbox.containerId!]);
        proc.on('close', () => resolve());
        proc.on('error', () => resolve()); // Handle error to prevent hangs
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

function normalizeSandboxType(type: string): SandboxType {
  if (type === 'headless') {
    return 'docker';
  }
  if (type === 'docker' || type === 'desktop' || type === 'full-vm') {
    return type;
  }
  if (type === 'host') {
    return 'host';
  }
  return 'docker';
}
