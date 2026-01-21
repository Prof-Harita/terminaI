/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Task 44: WindowsBrokerContext Implementation
 *
 * This module implements the RuntimeContext interface for Windows using the
 * "Brain & Hands" AppContainer architecture. It provides:
 *
 * - Process isolation via AppContainer (same as UWP/Edge)
 * - IPC via Named Pipes (ACL-restricted to AppContainer SID)
 * - AMSI integration for script scanning
 * - Workspace ACL management on startup
 *
 * Architecture:
 * - "The Hands" (this context): Admin privileges, no network, executes commands
 * - "The Brain" (child process): AppContainer, has network, talks to LLM
 *
 * - "The Brain" (child process): AppContainer, has network, talks to LLM
 *
 * @see docs-terminai/architecture-sovereign-runtime.md Appendix M
 */

import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import type { RuntimeContext } from '@terminai/core';
import { BrokerServer } from './BrokerServer.js';
import {
  type BrokerRequest,
  type BrokerResponse,
  createSuccessResponse,
  createErrorResponse,
  type ExecuteResult,
} from './BrokerSchema.js';
import type { ExecutionOptions } from '@terminai/core';

// Native module loaded lazily
let native: typeof import('./native.js') | null = null;
let nativeLoaded = false;

async function loadNative() {
  if (nativeLoaded) return native;
  try {
    native = await import('./native.js');
  } catch {
    // ignore
  }
  nativeLoaded = true;
  return native;
}

/**
 * Error codes from native module
 */
enum AppContainerError {
  Success = 0,
  ProfileCreationFailed = -1,
  AclFailure = -2,
  ProcessCreationFailed = -3,
  InvalidArguments = -4,
  CapabilityError = -5,
}

export interface WindowsBrokerContextOptions {
  /** CLI version for runtime identification */
  cliVersion: string;
  /** Workspace path for file operations */
  workspacePath?: string;
  /** Path to the Brain script to execute in sandbox */
  brainScript?: string;
}

/**
 * WindowsBrokerContext implements RuntimeContext for Windows using AppContainer.
 *
 * This is the "Hands" side of the architecture - it runs with elevated privileges
 * but has NO network access. The "Brain" runs in an AppContainer sandbox with
 * network access but restricted file system access.
 */
export class WindowsBrokerContext implements RuntimeContext {
  readonly type = 'windows-appcontainer' as const;
  readonly isIsolated = true;
  readonly displayName = 'Windows AppContainer Sandbox';

  private readonly cliVersion: string;
  private readonly workspacePath: string;
  private readonly brainScript: string;

  private brokerServer: BrokerServer | null = null;
  private brainPid: number | null = null;
  private _pythonPath: string | null = null;

  constructor(options: WindowsBrokerContextOptions) {
    this.cliVersion = options.cliVersion;
    this.workspacePath =
      options.workspacePath ??
      path.join(os.homedir(), '.terminai', 'workspace');
    this.brainScript = options.brainScript ?? 'agent-brain.js';
  }

  /**
   * Get the version of T-APTS available in this runtime.
   */
  get taptsVersion(): string {
    return this.cliVersion;
  }

  /**
   * Get the Python path (discovered in the sandbox).
   */
  get pythonPath(): string {
    // Python path is provided by the Brain process via IPC
    return this._pythonPath ?? 'python';
  }

  /**
   * Check if the native module is available.
   */
  /**
   * Check if the native module is available.
   */
  static async isAvailable(): Promise<boolean> {
    const n = await loadNative();
    return n?.isWindows === true;
  }

  /**
   * Initialize the WindowsBrokerContext.
   *
   * Steps:
   * 1. Ensure workspace directory exists
   * 2. Create AppContainer profile (if not exists)
   * 3. Grant workspace ACLs to AppContainer
   * 4. Start Broker server
   * 5. Spawn Brain process in AppContainer
   */
  async initialize(): Promise<void> {
    await loadNative();
    if (!native?.isWindows) {
      throw new Error('WindowsBrokerContext is only available on Windows');
    }

    // Step 1: Ensure workspace exists
    await fs.mkdir(this.workspacePath, { recursive: true });

    // Step 2 & 3: Create AppContainer and grant ACLs
    // This is handled by the native module in createAppContainerSandbox

    // Step 4: Start Broker server
    this.brokerServer = new BrokerServer({
      workspacePath: this.workspacePath,
      checkNodePermissions: true,
    });

    // Set up request handler
    this.brokerServer.on('request', this.handleRequest.bind(this));

    this.brokerServer.on('error', (error) => {
      console.error('[WindowsBrokerContext] Broker error:', error.message);
    });

    await this.brokerServer.start();
    console.log(
      `[WindowsBrokerContext] Broker listening on ${this.brokerServer.path}`,
    );

    // Step 5: Spawn Brain in AppContainer
    const commandLine = `node "${this.brainScript}" --pipe="${this.brokerServer.path}"`;

    const result = native.createAppContainerSandbox(
      commandLine,
      this.workspacePath,
      true, // Enable internet access for LLM calls
    );

    if (result < 0) {
      await this.brokerServer.stop();
      throw new Error(this.getErrorMessage(result as AppContainerError));
    }

    this.brainPid = result;
    console.log(
      `[WindowsBrokerContext] Brain process started with PID ${this.brainPid}`,
    );
  }

  /**
   * Get human-readable error message for native module error codes.
   */
  private getErrorMessage(error: AppContainerError): string {
    switch (error) {
      case AppContainerError.ProfileCreationFailed:
        return 'Failed to create AppContainer profile';
      case AppContainerError.AclFailure:
        return 'Failed to grant workspace access to AppContainer';
      case AppContainerError.ProcessCreationFailed:
        return 'Failed to create sandboxed process';
      case AppContainerError.InvalidArguments:
        return 'Invalid arguments for sandbox creation';
      case AppContainerError.CapabilityError:
        return 'Failed to set sandbox capabilities';
      default:
        return `Unknown error: ${error}`;
    }
  }

      default:
        return `Unknown error: ${error}`;
    }
  }

  async execute(
    command: string,
    options?: ExecutionOptions,
  ): Promise<ExecuteResult> {
    throw new Error(
      'WindowsBrokerContext host-side execution not implemented. Logic should run inside the AppContainer.',
    );
  }

  /**
   * Handle incoming IPC requests from the Brain process.
   */
  private async handleRequest(
    request: BrokerRequest,
    respond: (response: BrokerResponse) => void,
  ): Promise<void> {
    try {
      switch (request.type) {
        case 'ping':
          respond(createSuccessResponse({ pong: true, timestamp: Date.now() }));
          break;

        case 'execute':
          await this.handleExecute(request, respond);
          break;

        case 'readFile':
          await this.handleReadFile(request, respond);
          break;

        case 'writeFile':
          await this.handleWriteFile(request, respond);
          break;

        case 'listDir':
          await this.handleListDir(request, respond);
          break;

        case 'powershell':
          await this.handlePowerShell(request, respond);
          break;

        case 'amsiScan':
          await this.handleAmsiScan(request, respond);
          break;

        default:
          respond(
            createErrorResponse(
              `Unknown request type: ${(request as any).type}`,
            ),
          );
      }
    } catch (error) {
      respond(createErrorResponse((error as Error).message));
    }
  }

  /**
   * Handle 'execute' request.
   */
  /**
   * Handle 'execute' request.
   * HARDENED: Only allows specific commands and disables shell execution.
   */
  private async handleExecute(
    request: Extract<BrokerRequest, { type: 'execute' }>,
    respond: (response: BrokerResponse) => void,
  ): Promise<void> {
    const { spawn } = await import('node:child_process');

    const args = request.args ?? [];
    const cwd = request.cwd ?? this.workspacePath;
    const timeout = request.timeout ?? 30000;

    // Security: Strict Allowlist
    const ALLOWED_COMMANDS = ['echo', 'dir']; // Minimal allowlist for connectivity check
    // Real sidecars should be registered and invoked by specific ID, not arbitrary command string.

    if (!ALLOWED_COMMANDS.includes(request.command)) {
      respond(
        createSuccessResponse({
          exitCode: 1,
          stdout: '',
          stderr: `Command '${request.command}' is not allowed by Windows Broker policy.`,
          timedOut: false,
        }),
      );
      return;
    }

    return new Promise((resolve) => {
      const proc = spawn(request.command, args, {
        cwd,
        env: { ...process.env, ...request.env },
        timeout,
        shell: false, // CRITICAL: Disable shell to prevent injection
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        const result: ExecuteResult = {
          exitCode: -1,
          stdout,
          stderr: error.message,
          timedOut: false,
        };
        respond(createSuccessResponse(result));
        resolve();
      });

      proc.on('close', (code) => {
        const result: ExecuteResult = {
          exitCode: code ?? -1,
          stdout,
          stderr,
          timedOut,
          stderr: stderr || (code !== 0 ? 'Process failed' : ''),
        };
        respond(createSuccessResponse(result));
        resolve();
      });

      // Handle timeout
      setTimeout(() => {
        if (!proc.killed) {
          timedOut = true;
          proc.kill('SIGKILL');
        }
      }, timeout);
    });
  }

  /**
   * Handle 'readFile' request.
   */
  private async handleReadFile(
    request: Extract<BrokerRequest, { type: 'readFile' }>,
    respond: (response: BrokerResponse) => void,
  ): Promise<void> {
    const filePath = path.isAbsolute(request.path)
      ? request.path
      : path.join(this.workspacePath, request.path);

    const encoding = request.encoding ?? 'utf-8';

    try {
      const content = await fs.readFile(filePath, {
        encoding: encoding === 'base64' ? null : 'utf-8',
      });

      const data =
        encoding === 'base64'
          ? (content as Buffer).toString('base64')
          : content;

      respond(createSuccessResponse(data));
    } catch (error) {
      respond(
        createErrorResponse(`Failed to read file: ${(error as Error).message}`),
      );
    }
  }

  /**
   * Handle 'writeFile' request.
   */
  private async handleWriteFile(
    request: Extract<BrokerRequest, { type: 'writeFile' }>,
    respond: (response: BrokerResponse) => void,
  ): Promise<void> {
    const filePath = path.isAbsolute(request.path)
      ? request.path
      : path.join(this.workspacePath, request.path);

    const encoding = request.encoding ?? 'utf-8';

    try {
      if (request.createDirs) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
      }

      const content =
        encoding === 'base64'
          ? Buffer.from(request.content, 'base64')
          : request.content;

      await fs.writeFile(filePath, content);
      respond(createSuccessResponse({ written: true }));
    } catch (error) {
      respond(
        createErrorResponse(
          `Failed to write file: ${(error as Error).message}`,
        ),
      );
    }
  }

  /**
   * Handle 'listDir' request.
   */
  private async handleListDir(
    request: Extract<BrokerRequest, { type: 'listDir' }>,
    respond: (response: BrokerResponse) => void,
  ): Promise<void> {
    const dirPath = path.isAbsolute(request.path)
      ? request.path
      : path.join(this.workspacePath, request.path);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const includeHidden = request.includeHidden ?? false;

      const results = await Promise.all(
        entries
          .filter((entry) => includeHidden || !entry.name.startsWith('.'))
          .map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            try {
              const stat = await fs.stat(fullPath);
              return {
                name: entry.name,
                isDirectory: entry.isDirectory(),
                size: stat.size,
                modified: stat.mtime.toISOString(),
              };
            } catch {
              return {
                name: entry.name,
                isDirectory: entry.isDirectory(),
              };
            }
          }),
      );

      respond(createSuccessResponse(results));
    } catch (error) {
      respond(
        createErrorResponse(
          `Failed to list directory: ${(error as Error).message}`,
        ),
      );
    }
  }

  /**
   * Handle 'powershell' request with AMSI scanning.
   */
  private async handlePowerShell(
    request: Extract<BrokerRequest, { type: 'powershell' }>,
    respond: (response: BrokerResponse) => void,
  ): Promise<void> {
    // AMSI scan before execution
    if (native?.isAmsiAvailable) {
      const scanResult = native.amsiScanBuffer(request.script, 'script.ps1');
      if (!scanResult.clean) {
        respond(
          createErrorResponse(
            `AMSI blocked script execution: ${scanResult.description}`,
            'AMSI_BLOCKED',
          ),
        );
        return;
      }
    }

    // Execute PowerShell script
    const { spawn } = await import('node:child_process');
    const timeout = request.timeout ?? 60000;

    return new Promise((resolve) => {
      const proc = spawn(
        'powershell',
        ['-NoProfile', '-Command', request.script],
        {
          cwd: request.cwd ?? this.workspacePath,
          timeout,
        },
      );

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const result: ExecuteResult = {
          exitCode: code ?? -1,
          stdout,
          stderr,
          timedOut,
        };
        respond(createSuccessResponse(result));
        resolve();
      });

      setTimeout(() => {
        if (!proc.killed) {
          timedOut = true;
          proc.kill('SIGKILL');
        }
      }, timeout);
    });
  }

  /**
   * Handle 'amsiScan' request.
   */
  private async handleAmsiScan(
    request: Extract<BrokerRequest, { type: 'amsiScan' }>,
    respond: (response: BrokerResponse) => void,
  ): Promise<void> {
    if (!native?.isAmsiAvailable) {
      respond(
        createSuccessResponse({
          clean: true,
          result: 0,
          description: 'AMSI not available',
        }),
      );
      return;
    }

    const result = native.amsiScanBuffer(request.content, request.filename);
    respond(createSuccessResponse(result));
  }

  /**
   * Perform health check on the runtime.
   */
  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    // Check Broker server is running
    if (!this.brokerServer?.running) {
      return { ok: false, error: 'Broker server not running' };
    }

    // Check Brain process is alive
    if (this.brainPid === null) {
      return { ok: false, error: 'Brain process not started' };
    }

    // TODO: Send ping to Brain and verify response

    return { ok: true };
  }

  /**
   * Clean up resources.
   */
  async dispose(): Promise<void> {
    // Stop Broker server
    if (this.brokerServer) {
      await this.brokerServer.stop();
      this.brokerServer = null;
    }

    // Kill Brain process if still running
    if (this.brainPid !== null) {
      try {
        process.kill(this.brainPid, 'SIGTERM');
      } catch {
        // Process may already be dead
      }
      this.brainPid = null;
    }

    console.log('[WindowsBrokerContext] Disposed');
  }

  async execute(
    command: string,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult> {
    throw new Error('Windows Broker execute not implemented yet');
  }

  async spawn(
    command: string,
    options?: ExecutionOptions,
  ): Promise<RuntimeProcess> {
    throw new Error('Windows Broker spawn not implemented yet');
  }
}
