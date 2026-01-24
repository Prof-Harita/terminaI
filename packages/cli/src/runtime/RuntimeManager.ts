/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';

import * as path from 'node:path';
import * as os from 'node:os';
import { createInterface } from 'node:readline';
import process from 'node:process';
import type { RuntimeContext } from '@terminai/core';
import { LocalRuntimeContext } from './LocalRuntimeContext.js';
import { MicroVMRuntimeContext } from '@terminai/microvm';
import { checkAppContainerGate } from './windows/featureGate.js';

// Conditionally import Windows-specific module
// WindowsBrokerContext import moved to method to avoid Top-Level Await
let WindowsBrokerContextClass:
  | typeof import('./windows/WindowsBrokerContext.js').WindowsBrokerContext
  | null = null;

export class RuntimeManager {
  private readonly cliVersion: string;
  private cachedContext?: RuntimeContext;

  constructor(cliVersion: string) {
    this.cliVersion = cliVersion;
  }

  /**
   * Returns the best available runtime for this system.
   * Priority:
   *   1. Container (Docker/Podman) - Cross-platform
   *   2. Windows AppContainer - Windows only, trusted by Defender
   *   3. Managed Local - Fallback with explicit user consent
   */
  async getContext(): Promise<RuntimeContext> {
    if (this.cachedContext) {
      return this.cachedContext;
    }

    // Tier 1 (Priority): Micro-VM (Linux only)
    // Wired and ready for activation via MicroVMRuntimeContext.isAvailable()
    if (await this.isMicroVMAvailable()) {
      const context = new MicroVMRuntimeContext();
      await context.initialize();
      const health = await context.healthCheck();
      if (!health.ok) {
        await context.dispose();
        throw new Error(`MicroVM health check failed: ${health.error}`);
      }
      console.log('[TerminaI] Runtime: Sovereign Micro-VM (Tier 1)');
      this.cachedContext = context;
      return context;
    }

    // Tier 1.5: Container (Docker/Podman) - Phase 2 Activation
    if (await this.isContainerRuntimeAvailable()) {
      const { ContainerRuntimeContext } = await import(
        './ContainerRuntimeContext.js'
      );
      const context = new ContainerRuntimeContext(this.cliVersion);
      await context.initialize();
      const health = await context.healthCheck();
      if (!health.ok) {
        await context.dispose();
        throw new Error(`Container health check failed: ${health.error}`);
      }
      console.log('[TerminaI] Runtime: Docker/Podman Container (Tier 1.5)');
      this.cachedContext = context;
      return context;
    }

    // Tier 1.5 (Windows only): AppContainer Broker
    if ((await this.isWindowsBrokerAvailable()) && WindowsBrokerContextClass) {
      try {
        const context = new WindowsBrokerContextClass({
          cliVersion: this.cliVersion,
          workspacePath: path.join(os.homedir(), '.terminai', 'workspace'),
        });
        await context.initialize();
        const health = await context.healthCheck();
        if (!health.ok) {
          await context.dispose();
          throw new Error(`Windows Broker health check failed: ${health.error}`);
        }
        console.log('[TerminaI] Runtime: Windows AppContainer (Tier 1.5)');
        this.cachedContext = context;
        return context;
      } catch (error) {
        console.warn(
          '[RuntimeManager] Windows AppContainer failed, falling back to host:',
          (error as Error).message,
        );
      }
    }

    // Tier 2: Managed Local (Fallback) - Requires explicit consent
    if (await this.isSystemPythonAvailable()) {
      const pythonPath = this.findPythonExecutable();
      if (pythonPath) {
        const allowed = await this.promptForDirectHostAccess();
        if (!allowed) {
          throw new Error('Direct host access denied by user or policy.');
        }

        const localContext = new LocalRuntimeContext(
          pythonPath,
          this.cliVersion,
        );
        await localContext.initialize();
        const health = await localContext.healthCheck();
        if (!health.ok) {
          await localContext.dispose();
          throw new Error(`Local runtime health check failed: ${health.error}`);
        }
        console.log('[TerminaI] Runtime: Local Host (Tier 2)');
        this.cachedContext = localContext;
        return localContext;
      }
    }

    throw new Error(
      'No suitable runtime found. Install Docker or Python 3.10+.',
    );
  }

  /**
   * Task 32: Check if Micro-VM is available
   */
  private async isMicroVMAvailable(): Promise<boolean> {
    return MicroVMRuntimeContext.isAvailable();
  }

  /**
   * Task 46: Check if Windows AppContainer Broker is available.
   * This is only true on Windows with the native module built.
   */
  private async isWindowsBrokerAvailable(): Promise<boolean> {
    const gateResult = await checkAppContainerGate();
    if (!gateResult.enabled) {
      console.log(
        `[RuntimeManager] Windows AppContainer disabled: ${gateResult.reason}`,
      );
      return false;
    }

    try {
      if (!WindowsBrokerContextClass) {
        const mod = await import('./windows/WindowsBrokerContext.js');
        WindowsBrokerContextClass = mod.WindowsBrokerContext;
      }
    } catch {
      // Module missing
      console.log('[RuntimeManager] Windows AppContainer module not found');
      return false;
    }

    // Check if WindowsBrokerContext reports it's available
    if (
      !WindowsBrokerContextClass ||
      !(await WindowsBrokerContextClass.isAvailable())
    ) {
      console.log('[RuntimeManager] Windows AppContainer not available');
      return false;
    }

    return true;
  }

  /**
   * Task 7: Detect if we are already running inside a container.
   * Prevents nested container starts (Docker-in-Docker complexity).
   */
  private isInsideContainer(): boolean {
    // 1. Check for /.dockerenv
    if (fs.existsSync('/.dockerenv')) return true;

    // 2. Check for docker/kubepods in cgroup
    try {
      const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf-8');
      return cgroup.includes('docker') || cgroup.includes('kubepods');
    } catch {
      return false;
    }
  }

  /**
   * Task 5: Implement container detection logic
   * Checks for docker or podman DAEMON availability (not just binary)
   */
  private async isContainerRuntimeAvailable(): Promise<boolean> {
    if (this.isInsideContainer()) {
      console.log(
        '[RuntimeManager] Already running inside a container. Disabling Tier 1.5 to prevent nesting.',
      );
      return false;
    }

    // Check Docker daemon (not just binary)
    try {
      execSync('docker info', { stdio: 'ignore', timeout: 2000 });
      return true;
    } catch {
      // Docker daemon not running or not installed
    }

    // Check Podman daemon
    try {
      execSync('podman info', { stdio: 'ignore', timeout: 2000 });
      return true;
    } catch {
      // Podman not available
    }

    return false;
  }

  /**
   * Task 6: Implement Python discovery logic
   * Checks for python3 or python availability with VERSION VALIDATION (>= 3.10)
   */
  private async isSystemPythonAvailable(): Promise<boolean> {
    return this.findPythonExecutable() !== null;
  }

  /**
   * Helper to find the actual executable path with version validation
   */
  private findPythonExecutable(): string | null {
    const candidates = [
      // User override
      process.env['TERMINAI_PYTHON_PATH'],
      // Standard Unix
      'python3',
      'python',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      // Windows
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      // pyenv
      path.join(os.homedir(), '.pyenv', 'shims', 'python3'),
    ];

    for (const cmd of candidates) {
      if (!cmd) continue;

      try {
        // Check if executable exists and get version
        const version = execSync(`${cmd} --version`, {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });

        // Parse version (e.g., "Python 3.11.5")
        const match = version.match(/Python (\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1], 10);
          const minor = parseInt(match[2], 10);

          // Require Python 3.10+
          if (major === 3 && minor >= 10) {
            return cmd;
          }
        }
      } catch {
        // Command not found or execution failed, try next
        continue;
      }
    }

    return null;
  }
  /**
   * Task 13: Direct Host Access UI
   */
  private async promptForDirectHostAccess(): Promise<boolean> {
    if (process.env['TERMINAI_ALLOW_DIRECT_HOST'] === 'true') {
      return true;
    }

    if (!process.stdin.isTTY) {
      console.error(
        'Error: Tier 2 (Direct Host Access) requires explicit opt-in via TERMINAI_ALLOW_DIRECT_HOST=true in non-interactive environments.',
      );
      return false;
    }

    console.warn('\n\x1b[33m[WARNING] Direct Host Access Mode Detected\x1b[0m');
    console.warn(
      'You are about to allow TerminaI to execute code directly on your host machine.',
    );
    console.warn(
      'This grants the agent full access to your files and network with your user privileges.',
    );
    console.warn(
      'For better isolation, please install Docker or Podman (Tier 1).',
    );

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(
        '\nType "yes" to proceed with Direct Host Access: ',
        (answer) => {
          rl.close();
          resolve(answer.trim().toLowerCase() === 'yes');
        },
      );
    });
  }
}
