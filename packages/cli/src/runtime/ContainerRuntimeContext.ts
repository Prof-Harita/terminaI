/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  RuntimeContext,
  ExecutionOptions,
  ExecutionResult,
  RuntimeProcess,
} from '@terminai/core';

/**
 * ContainerRuntimeContext - Docker/Podman Container Runtime (Phase 3)
 *
 * @deprecated Container support is deferred to Phase 3.
 *
 * Rationale:
 * - Micro-VM provides better isolation with faster boot times
 * - Windows users require AppContainer (not Linux containers) for System Operator tasks
 * - "Widest audience, least pain" principle prioritizes Micro-VM auto-installation
 *
 * This class exists as a stub for future implementation.
 * It is NOT currently wired into RuntimeManager.
 *
 * @see architecture-sovereign-runtime.md Section 6 (Micro-VM Priority)
 * @see packages/microvm/src/MicroVMRuntimeContext.ts (Preferred isolation)
 * @see packages/cli/src/runtime/windows/WindowsBrokerContext.ts (Windows isolation)
 */
export class ContainerRuntimeContext implements RuntimeContext {
  readonly type = 'container';
  readonly executionEnvironment = 'container';
  readonly isIsolated = true;
  readonly displayName = 'Docker Container';

  readonly pythonPath = '/opt/terminai/venv/bin/python3';
  readonly taptsVersion: string;

  private containerId: string | null = null;
  private workspacePath: string | null = null;
  private mountMappings: Map<string, string> = new Map();
  private readonly imageName = 'terminai-sandbox:latest';

  constructor(cliVersion: string) {
    this.taptsVersion = cliVersion;
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    const { execSync } = await import('node:child_process');
    try {
      execSync('docker info', { stdio: 'ignore' });
      return { ok: true };
    } catch (_error) {
      return { ok: false, error: 'Docker daemon not reachable' };
    }
  }

  async initialize(workspacePath?: string): Promise<void> {
    const { execSync } = await import('node:child_process');

    this.workspacePath = workspacePath || process.cwd();
    // Register mount mapping (host:container for identity mount)
    this.mountMappings.set(this.workspacePath, this.workspacePath);

    // 1. Check Docker availability
    try {
      execSync('docker info', { stdio: 'ignore' });
    } catch {
      throw new Error('Docker is not available or not reachable.');
    }

    // 2. Start the container
    try {
      // Add bind mount for workspace
      const mountFlag = `-v "${this.workspacePath}:${this.workspacePath}"`;
      // Run detached, clean up on exit, init process, override entrypoint to keep alive
      this.containerId = execSync(
        `docker run -d --rm --init ${mountFlag} --entrypoint tail ${this.imageName} -f /dev/null`,
        { encoding: 'utf-8' },
      ).trim();
    } catch (e) {
      throw new Error(
        `Failed to start sandbox container (${this.imageName}): ${e}`,
      );
    }
  }

  async dispose(): Promise<void> {
    if (this.containerId) {
      const { execSync } = await import('node:child_process');
      try {
        execSync(`docker rm -f ${this.containerId}`, { stdio: 'ignore' });
      } catch {
        // Ignore errors during cleanup
      }
      this.containerId = null;
    }
  }

  async execute(
    command: string,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult> {
    const { execFile } = await import('node:child_process');

    if (!this.containerId) {
      throw new Error('Container not initialized. Call initialize() first.');
    }

    const hostCwd = options?.cwd || this.workspacePath || '/home/node';
    const containerCwd = this.translatePath(hostCwd);

    // Preflight check: verify cwd exists in container
    const checkResult = await this.rawExec(
      `test -d "${containerCwd}" && echo OK`,
    );
    if (!checkResult.stdout.includes('OK')) {
      return {
        stdout: '',
        stderr: `Container error: directory "${containerCwd}" does not exist. Ensure bind mount is configured.`,
        exitCode: 1,
      };
    }

    return new Promise((resolve) => {
      const args = ['exec'];

      // Working directory
      args.push('-w', containerCwd);

      // Environment variables
      if (options?.env) {
        Object.entries(options.env).forEach(([k, v]) => {
          args.push('-e', `${k}=${v}`);
        });
      }

      // Container ID
      args.push(this.containerId!);

      // Command (wrapped in sh -c for shell features)
      args.push('/bin/sh', '-c', command);

      execFile(
        'docker',
        args,
        { encoding: 'utf-8' },
        (error, stdout, stderr) => {
          const combinedOutput = `${stdout}${stderr}`;
          const runtimeError = this.detectRuntimeError(combinedOutput);

          if (runtimeError) {
            resolve({
              stdout: '',
              stderr: runtimeError,
              exitCode: 126, // "Command invoked cannot execute"
              runtimeError,
            });
            return;
          }

          resolve({
            stdout,
            stderr,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            exitCode: error ? ((error as any).code ?? 1) : 0,
          });
        },
      );
    });
  }

  private translatePath(hostPath: string): string {
    for (const [hostPrefix, containerPrefix] of this.mountMappings) {
      if (hostPath.startsWith(hostPrefix)) {
        return hostPath.replace(hostPrefix, containerPrefix);
      }
    }

    // Path not mounted - this will likely fail
    console.warn(`[Container] Path "${hostPath}" is not mounted in container`);
    return hostPath;
  }

  private async rawExec(command: string): Promise<ExecutionResult> {
    const { execFile } = await import('node:child_process');
    if (!this.containerId) {
      throw new Error('Container not initialized');
    }
    return new Promise((resolve) => {
      execFile(
        'docker',
        ['exec', this.containerId!, '/bin/sh', '-c', command],
        (error, stdout, stderr) => {
          resolve({
            stdout,
            stderr,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            exitCode: error ? ((error as any).code ?? 1) : 0,
          });
        },
      );
    });
  }

  private detectRuntimeError(output: string): string | null {
    const OCI_RUNTIME_ERROR_PATTERNS = [
      'OCI runtime exec failed',
      'container process: chdir to cwd',
      'no such file or directory',
      'docker: Error response from daemon',
    ];

    for (const pattern of OCI_RUNTIME_ERROR_PATTERNS) {
      if (output.toLowerCase().includes(pattern.toLowerCase())) {
        return `Container runtime error detected: ${output.trim()}`;
      }
    }
    return null;
  }

  async spawn(
    command: string,
    options?: ExecutionOptions,
  ): Promise<RuntimeProcess> {
    const { spawn } = await import('node:child_process');
    if (!this.containerId) {
      throw new Error('Container not initialized. Call initialize() first.');
    }

    const args = ['exec', '-i']; // -i for interaction (stdin)

    // Working directory
    args.push('-w', options?.cwd || '/home/node');

    // Environment variables
    if (options?.env) {
      Object.entries(options.env).forEach(([k, v]) => {
        args.push('-e', `${k}=${v}`);
      });
    }

    // Container ID
    args.push(this.containerId);

    // Command (wrapped in sh -c)
    args.push('/bin/sh', '-c', command);

    // Use spawn directly for streaming
    const child = spawn('docker', args);
    return child as unknown as RuntimeProcess;
  }
}
