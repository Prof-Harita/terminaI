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
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LocalRuntimeContext implements RuntimeContext {
  readonly type = 'local';
  readonly isIsolated = false;
  readonly displayName = 'Host Python (Direct Access)';

  private pythonPathInternal: string;
  readonly taptsVersion: string;

  private venvPath: string | null = null;

  constructor(pythonExecutable: string, cliVersion: string) {
    this.pythonPathInternal = pythonExecutable;
    this.taptsVersion = cliVersion;
  }

  get pythonPath(): string {
    return this.pythonPathInternal;
  }

  /**
   * Bootstraps the local environment:
   * 1. Checks for cached venv
   * 2. Creates if missing
   * 3. Installs/Updates T-APTS
   */
  async initialize(): Promise<void> {
    const terminaiDir = path.join(os.homedir(), '.terminai');
    const envsDir = path.join(terminaiDir, 'envs');
    // Use a hash of the python path + version to handle upgrades, or just 'default' for now.
    // 'default' is simpler for Phase 1.
    const venvName = 'default';
    this.venvPath = path.join(envsDir, venvName);

    if (!fs.existsSync(envsDir)) {
      fs.mkdirSync(envsDir, { recursive: true });
    }

    if (!fs.existsSync(this.venvPath)) {
      // Create venv
      const { execSync } = await import('node:child_process');
      try {
        execSync(`"${this.pythonPath}" -m venv "${this.venvPath}"`, {
          stdio: 'ignore',
        });
      } catch (e) {
        throw new Error(
          `Failed to create managed venv at ${this.venvPath}: ${e}`,
        );
      }
    }

    // Update pythonPath to point to the venv python
    // This effectively "activates" the venv for subsequent usages
    const venvPython =
      os.platform() === 'win32'
        ? path.join(this.venvPath, 'Scripts', 'python.exe')
        : path.join(this.venvPath, 'bin', 'python3');

    this.pythonPathInternal = venvPython;

    // Task 9: Bootstrap T-APTS
    await this.installTapts(this.pythonPathInternal);
  }

  private async installTapts(pythonExecutable: string): Promise<void> {
    const aptsPath = this.resolveAptsPath();
    if (!aptsPath) {
      // In production/Phase 1, we might not have the package available yet.
      // Warn but proceed if it's not critical (or throw if it is).
      console.warn(
        'Warning: T-APTS package not found. Runtime functionality may be limited.',
      );
      return;
    }

    const { execSync } = await import('node:child_process');
    try {
      // Upgrade pip and setuptools first
      execSync(
        `"${pythonExecutable}" -m pip install --upgrade pip setuptools`,
        {
          stdio: 'ignore',
        },
      );
      // Install T-APTS
      // Task 9: Use --no-index --no-deps for security (no PyPI fallback, stdlib-only)
      // Use --no-build-isolation to use the installed setuptools instead of hitting PyPI for build environment
      execSync(
        `"${pythonExecutable}" -m pip install "${aptsPath}" --no-index --no-deps --no-build-isolation`,
        {
          stdio: 'ignore',
        },
      );
    } catch (e) {
      throw new Error(`Failed to install T-APTS from ${aptsPath}: ${e}`);
    }
  }

  private resolveAptsPath(): string | null {
    // 1. Try to resolve source relative to this file (dev/monorepo)
    const sourceCandidates = [
      path.resolve(__dirname, '../../../../sandbox-image/python'), // From src
      path.resolve(__dirname, '../../../sandbox-image/python'), // From dist
      path.resolve(process.cwd(), 'packages/sandbox-image/python'), // Fallback to repo root
    ];

    for (const p of sourceCandidates) {
      if (fs.existsSync(path.join(p, 'pyproject.toml'))) {
        return p;
      }
    }

    // 2. Try to resolve wheel in dist (bundled/production)
    // We look for a file matching `terminai_apts-*.whl`

    // In standard build:
    // packages/cli/src/runtime/LocalRuntimeContext.ts
    // packages/cli/dist/index.js (bundled)
    // Wheel is in packages/cli/dist/terminai_apts-*.whl

    // If running from source (ts-node): __dirname is packages/cli/src/runtime
    // dist is packages/cli/dist
    const cliDist = path.resolve(__dirname, '../../dist');
    if (fs.existsSync(cliDist)) {
      const files = fs.readdirSync(cliDist);
      const wheel = files.find(
        (f) => f.startsWith('terminai_apts-') && f.endsWith('.whl'),
      );
      if (wheel) return path.join(cliDist, wheel);
    }

    // If running from dist (bundled): __dirname might be packages/cli/dist/runtime?
    // Or if bundled into single file, __dirname is virtual or weird.
    // Assuming file copy structure or standard tsc output:
    // packages/cli/dist/runtime/LocalRuntimeContext.js
    // Then dist is ../
    const relativeDist = path.resolve(__dirname, '../');
    if (fs.existsSync(relativeDist)) {
      const files = fs.readdirSync(relativeDist);
      const wheel = files.find(
        (f) => f.startsWith('terminai_apts-') && f.endsWith('.whl'),
      );
      if (wheel) return path.join(relativeDist, wheel);
    }

    return null;
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    if (!fs.existsSync(this.pythonPath)) {
      return {
        ok: false,
        error: `Python executable not found at ${this.pythonPath}`,
      };
    }
    return { ok: true };
  }

  async dispose(): Promise<void> {
    // Nothing to dispose for local runtime yet
  }

  async spawn(
    command: string,
    options?: ExecutionOptions,
  ): Promise<RuntimeProcess> {
    const { spawn } = await import('node:child_process');
    const args = options?.args ?? [];
    const child = spawn(command, args, {
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env },
      stdio: 'pipe',
    });
    return child as unknown as RuntimeProcess;
  }

  async execute(
    command: string,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult> {
    const { spawn } = await import('node:child_process');

    return new Promise((resolve, reject) => {
      const args = options?.args ?? [];
      const child = spawn(command, args, {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options?.timeout,
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        // child_process.spawn might return null exitCode on signal kill
        resolve({
          stdout,
          stderr,
          exitCode: code ?? -1,
        });
      });
    });
  }
}
