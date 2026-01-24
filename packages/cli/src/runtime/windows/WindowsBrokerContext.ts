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
 *
 * @see docs-terminai/architecture-sovereign-runtime.md Appendix M
 */

import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  ApprovalMode,
  type AuditActor,
  type AuditEvent,
  type AuditEventType,
  type AuditLedger,
  type AuditProvenance,
  type AuditReviewLevel,
  type RuntimeContext,
  type ExecutionOptions,
  type ExecutionResult,
  type RuntimeProcess,
} from '@terminai/core';
import { BrokerServer } from './BrokerServer.js';
import {
  type BrokerRequest,
  type BrokerResponse,
  createSuccessResponse,
  createErrorResponse,
  type ExecuteResult,
} from './BrokerSchema.js';
import { parse } from 'shell-quote';
import { BrokerPolicyEngine } from './BrokerPolicyEngine.js';
import { canonicalizePath, classifyZone } from './PathUtils.js';
import { ApprovalService } from './ApprovalService.js';

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
  readonly executionEnvironment = 'appcontainer';
  readonly isIsolated = true;
  readonly displayName = 'Windows AppContainer Sandbox';

  private readonly cliVersion: string;
  private readonly workspacePath: string;
  private readonly brainScript: string;
  private handshakeToken: string | null = null;

  private brokerServer: BrokerServer | null = null;
  private brainPid: number | null = null;
  private _pythonPath: string | null = null;
  private readonly policyEngine: BrokerPolicyEngine;
  private approvalService: ApprovalService;
  private auditLedger?: AuditLedger;
  private auditSessionId?: string;

  constructor(options: WindowsBrokerContextOptions) {
    this.cliVersion = options.cliVersion;
    this.workspacePath =
      options.workspacePath ??
      path.join(os.homedir(), '.terminai', 'workspace');
    this.brainScript = options.brainScript ?? this.resolveBrainScript();
    this.policyEngine = new BrokerPolicyEngine({
      commands: [
        'diskpart',
        'format',
        'dd',
        'vssadmin',
        'bcdedit',
        'mimikatz',
        'secretsdump',
      ],
    });
    this.approvalService = new ApprovalService({
      approvalMode: ApprovalMode.DEFAULT,
      approvalPin: process.env['TERMINAI_APPROVAL_PIN'] ?? '000000',
      isInteractive: process.stdin.isTTY,
    });
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

    const appContainerSid = native.ensureAppContainerProfile();
    if (!appContainerSid) {
      throw new Error('Failed to ensure AppContainer profile');
    }

    // Step 4: Start Broker server
    this.handshakeToken = randomUUID();
    this.brokerServer = new BrokerServer({
      workspacePath: this.workspacePath,
      checkNodePermissions: true,
      handshakeToken: this.handshakeToken,
      appContainerSid,
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

    const env = {
      TERMINAI_BROKER_PIPE: this.brokerServer.path,
      TERMINAI_HANDSHAKE_TOKEN: this.handshakeToken,
      TERMINAI_WORKSPACE_PATH: this.workspacePath,
      TERMINAI_CLI_VERSION: this.cliVersion,
    };
    const result = native.createAppContainerSandboxWithEnv(
      commandLine,
      this.workspacePath,
      true,
      env,
    );

    if (result < 0) {
      await this.brokerServer.stop();
      throw new Error(this.getErrorMessage(result as AppContainerError));
    }

    this.brainPid = result;
    console.log(
      `[WindowsBrokerContext] Brain process started with PID ${this.brainPid}`,
    );

    const handshakeTimeoutMs = 10_000;
    const start = Date.now();
    while (
      this.brokerServer &&
      !this.brokerServer.hasHandshake &&
      Date.now() - start < handshakeTimeoutMs
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!this.brokerServer?.hasHandshake) {
      await this.brokerServer?.stop();
      throw new Error('Brain handshake not completed within timeout');
    }
  }

  private resolveBrainScript(): string {
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    const distPath = path.join(currentDir, '..', '..', 'agent-brain.js');
    if (fsSync.existsSync(distPath)) {
      return distPath;
    }
    const cwdPath = path.join(
      process.cwd(),
      'packages',
      'cli',
      'dist',
      'agent-brain.js',
    );
    if (fsSync.existsSync(cwdPath)) {
      return cwdPath;
    }
    return 'agent-brain.js';
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

  /**
   * Safe command parsing using shell-quote.
   */
  private parseCommand(command: string): { cmd: string; args: string[] } {
    const parsed = parse(command);
    const args: string[] = [];
    for (const entry of parsed) {
      if (typeof entry === 'string') {
        args.push(entry);
      } else if ('op' in entry) {
        // Stop at first operator to prevent injection
        break;
      }
    }
    if (args.length === 0) return { cmd: '', args: [] };
    return { cmd: args[0], args: args.slice(1) };
  }

  /**
   * Resolve a path and optionally restrict to workspace.
   */
  private resolvePath(
    requestedPath: string,
    options?: { baseDir?: string; restrictToWorkspace?: boolean },
  ): string {
    const baseDir = options?.baseDir ?? this.workspacePath;
    const restrict = options?.restrictToWorkspace ?? true;
    const targetPath = path.resolve(baseDir, requestedPath);

    if (!restrict) {
      return targetPath;
    }

    const normalizedTarget = targetPath.toLowerCase();
    const normalizedWorkspace = this.workspacePath.toLowerCase();

    const isRoot = normalizedTarget === normalizedWorkspace;
    const isChild = normalizedTarget.startsWith(
      normalizedWorkspace + path.sep.toLowerCase(),
    );

    if (!isRoot && !isChild) {
      throw new Error(
        `Access Denied: Path '${requestedPath}' is outside the authorized workspace.`,
      );
    }

    return targetPath;
  }

  private pickHighestRiskZone(
    zones: Array<ReturnType<typeof classifyZone>>,
  ): ReturnType<typeof classifyZone> {
    const order: Array<ReturnType<typeof classifyZone>> = [
      'secrets',
      'system',
      'config',
      'userHome',
      'workspace',
      'unknown',
    ];
    for (const zone of order) {
      if (zones.includes(zone)) {
        return zone;
      }
    }
    return 'unknown';
  }

  setPolicyServices(options: {
    approvalMode: ApprovalMode;
    approvalPin: string;
    isInteractive: boolean;
    auditLedger?: AuditLedger;
    sessionId?: string;
  }): void {
    this.approvalService = new ApprovalService({
      approvalMode: options.approvalMode,
      approvalPin: options.approvalPin,
      isInteractive: options.isInteractive,
    });
    this.auditLedger = options.auditLedger;
    this.auditSessionId = options.sessionId;
  }

  private async appendAuditEvent(
    eventType: AuditEventType,
    toolName: string,
    callId: string,
    reviewLevel?: AuditReviewLevel,
    actor?: AuditActor,
    provenance: AuditProvenance[] = ['tool_output'],
    args?: Record<string, unknown>,
    result?: { success: boolean; errorType?: string; exitCode?: number },
  ): Promise<void> {
    if (!this.auditLedger || !this.auditSessionId) {
      return;
    }

    const event: AuditEvent = {
      version: 1,
      timestamp: new Date().toISOString(),
      eventType,
      sessionId: this.auditSessionId,
      provenance,
      reviewLevel,
      actor,
      tool: {
        callId,
        toolName,
        toolKind: 'runtime',
        args,
        result,
      },
    };

    try {
      await this.auditLedger.append(event);
    } catch (error) {
      console.warn(
        '[WindowsBrokerContext] Failed to append audit event:',
        (error as Error).message,
      );
    }
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
          respond(
            createSuccessResponse(request.id, {
              pong: true,
              timestamp: Date.now(),
            }),
          );
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

        case 'hello':
          // Handled by BrokerServer, but needed for type exhaustiveness
          respond(createSuccessResponse(request.id, { pong: true }));
          break;

        default: {
          const _exhaustive: never = request;
          void _exhaustive;
          respond(
            createErrorResponse(
              (request as any).id || '',
              'Unknown request type',
            ),
          );
          break;
        }
      }
    } catch (error) {
      respond(createErrorResponse(request.id, (error as Error).message));
    }
  }

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
    const mode = request.mode ?? 'exec';

    let resolvedCwd = cwd;
    try {
      resolvedCwd = this.resolvePath(cwd, { restrictToWorkspace: false });
    } catch (error) {
      respond(
        createSuccessResponse(request.id, {
          exitCode: 1,
          stdout: '',
          stderr: (error as Error).message,
          timedOut: false,
        }),
      );
      return;
    }

    const canonicalCwd = await canonicalizePath(resolvedCwd);
    let zone = classifyZone(
      canonicalCwd,
      this.workspacePath,
      path.join(os.homedir(), '.terminai'),
    );

    let scriptPath: string | null = null;
    const scriptArg = args.find((arg) =>
      /\.(ps1|bat|cmd|js|py|vbs|psm1|psd1)$/i.test(arg),
    );
    if (scriptArg) {
      scriptPath = this.resolvePath(scriptArg, {
        baseDir: resolvedCwd,
        restrictToWorkspace: false,
      });
      const canonicalScript = await canonicalizePath(scriptPath);
      const scriptZone = classifyZone(
        canonicalScript,
        this.workspacePath,
        path.join(os.homedir(), '.terminai'),
      );
      zone = this.pickHighestRiskZone([zone, scriptZone]);
    }

    const classification = this.policyEngine.classifyAction({
      command: request.command,
      args,
      mode,
      cwd: canonicalCwd,
      zone,
      targetPaths: scriptPath ? [scriptPath] : undefined,
    });

    await this.appendAuditEvent(
      'tool.requested',
      'windows-broker.execute',
      request.id,
      classification.level === 'DENY' ? undefined : classification.level,
      { kind: 'policy' },
      ['tool_output'],
      {
        command: request.command,
        args,
        mode,
        cwd: canonicalCwd,
        zone,
        policy: {
          level: classification.level,
          reason: classification.reason,
          riskFactors: classification.riskFactors,
        },
      },
    );

    if (classification.level === 'DENY') {
      respond(
        createErrorResponse(request.id, classification.reason, 'POLICY_DENIED'),
      );
      return;
    }

    const reviewLevel = classification.level;

    if (scriptPath) {
      if (!native?.isAmsiAvailable) {
        respond(
          createErrorResponse(
            request.id,
            'AMSI not available for script execution',
            'AMSI_BLOCKED',
          ),
        );
        return;
      }
      try {
        const scan = native.amsiScanFile(scriptPath);
        if (!scan.clean) {
          respond(
            createErrorResponse(
              request.id,
              `AMSI blocked script execution: ${scan.description}`,
              'AMSI_BLOCKED',
            ),
          );
          return;
        }
      } catch (error) {
        respond(
          createErrorResponse(
            request.id,
            `AMSI scan failed: ${(error as Error).message}`,
            'AMSI_BLOCKED',
          ),
        );
        return;
      }
    }

    if (classification.level !== 'A') {
      await this.appendAuditEvent(
        'tool.awaiting_approval',
        'windows-broker.execute',
        request.id,
        classification.level,
        { kind: 'policy' },
      );

      const approved = await this.approvalService.requestApproval(
        classification,
        {
          command: request.command,
          args,
          mode,
          cwd: canonicalCwd,
          zone,
          targetPaths: scriptPath ? [scriptPath] : undefined,
        },
      );

      await this.appendAuditEvent(
        approved ? 'tool.approved' : 'tool.denied',
        'windows-broker.execute',
        request.id,
        reviewLevel,
        { kind: approved ? 'user' : 'policy' },
      );

      if (!approved) {
        respond(
          createErrorResponse(
            request.id,
            'Execution denied by user approval',
            'APPROVAL_DENIED',
          ),
        );
        return;
      }
    }

    return new Promise((resolve) => {
      const proc =
        mode === 'shell'
          ? spawn('cmd', ['/c', request.command], {
              cwd: resolvedCwd,
              env: { ...process.env, ...request.env },
              timeout,
              shell: false,
            })
          : spawn(request.command, args, {
              cwd: resolvedCwd,
              env: { ...process.env, ...request.env },
              timeout,
              shell: false,
            });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      void this.appendAuditEvent(
        'tool.execution_started',
        'windows-broker.execute',
        request.id,
        reviewLevel,
        { kind: 'system' },
      );

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
        respond(createSuccessResponse(request.id, result));
        void this.appendAuditEvent(
          'tool.execution_failed',
          'windows-broker.execute',
          request.id,
          reviewLevel,
          { kind: 'system' },
          ['tool_output'],
          undefined,
          { success: false, errorType: 'EXECUTION_ERROR' },
        );
        resolve();
      });

      proc.on('close', (code) => {
        const result: ExecuteResult = {
          exitCode: code ?? -1,
          stdout,
          timedOut,
          stderr: stderr || (code !== 0 ? 'Process failed' : ''),
        };
        respond(createSuccessResponse(request.id, result));
        void this.appendAuditEvent(
          'tool.execution_finished',
          'windows-broker.execute',
          request.id,
          reviewLevel,
          { kind: 'system' },
          ['tool_output'],
          undefined,
          {
            success: (code ?? 1) === 0,
            exitCode: code ?? -1,
          },
        );
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
   * Handle 'readFile' request.
   */
  private async handleReadFile(
    request: Extract<BrokerRequest, { type: 'readFile' }>,
    respond: (response: BrokerResponse) => void,
  ): Promise<void> {
    const encoding = request.encoding ?? 'utf-8';

    try {
      // Security: Validate Path
      const filePath = this.resolvePath(request.path);

      const content = await fs.readFile(filePath, {
        encoding: encoding === 'base64' ? null : 'utf-8',
      });

      const data =
        encoding === 'base64'
          ? (content as Buffer).toString('base64')
          : content;

      respond(createSuccessResponse(request.id, data));
    } catch (error) {
      respond(
        createErrorResponse(
          request.id,
          `Failed to read file: ${(error as Error).message}`,
        ),
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
    const encoding = request.encoding ?? 'utf-8';

    try {
      // Security: Validate Path
      const filePath = this.resolvePath(request.path);

      if (request.createDirs) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
      }

      const content =
        encoding === 'base64'
          ? Buffer.from(request.content, 'base64')
          : request.content;

      await fs.writeFile(filePath, content);
      respond(createSuccessResponse(request.id, { written: true }));
    } catch (error) {
      respond(
        createErrorResponse(
          request.id,
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
    try {
      // Security: Validate Path
      const dirPath = this.resolvePath(request.path);

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

      respond(createSuccessResponse(request.id, results));
    } catch (error) {
      respond(
        createErrorResponse(
          request.id,
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
    if (!native?.isAmsiAvailable) {
      respond(
        createErrorResponse(
          request.id,
          'AMSI not available for script execution',
          'AMSI_BLOCKED',
        ),
      );
      return;
    }
    const scanResult = native.amsiScanBuffer(request.script, 'script.ps1');
    if (!scanResult.clean) {
      respond(
        createErrorResponse(
          request.id,
          `AMSI blocked script execution: ${scanResult.description}`,
          'AMSI_BLOCKED',
        ),
      );
      return;
    }

    const canonicalCwd = await canonicalizePath(
      this.resolvePath(request.cwd ?? this.workspacePath, {
        restrictToWorkspace: false,
      }),
    );
    const zone = classifyZone(
      canonicalCwd,
      this.workspacePath,
      path.join(os.homedir(), '.terminai'),
    );
    const classification = this.policyEngine.classifyAction({
      command: 'powershell',
      args: [],
      mode: 'shell',
      cwd: canonicalCwd,
      zone,
    });

    await this.appendAuditEvent(
      'tool.requested',
      'windows-broker.powershell',
      request.id,
      classification.level === 'DENY' ? undefined : classification.level,
      { kind: 'policy' },
      ['tool_output'],
      {
        command: 'powershell',
        mode: 'shell',
        cwd: canonicalCwd,
        zone,
        policy: {
          level: classification.level,
          reason: classification.reason,
          riskFactors: classification.riskFactors,
        },
      },
    );

    if (classification.level === 'DENY') {
      respond(
        createErrorResponse(request.id, classification.reason, 'POLICY_DENIED'),
      );
      return;
    }

    const reviewLevel = classification.level;

    if (classification.level !== 'A') {
      await this.appendAuditEvent(
        'tool.awaiting_approval',
        'windows-broker.powershell',
        request.id,
        reviewLevel,
        { kind: 'policy' },
      );
      const approved = await this.approvalService.requestApproval(
        classification,
        {
          command: 'powershell',
          args: [],
          mode: 'shell',
          cwd: canonicalCwd,
          zone,
        },
      );
      await this.appendAuditEvent(
        approved ? 'tool.approved' : 'tool.denied',
        'windows-broker.powershell',
        request.id,
        reviewLevel,
        { kind: approved ? 'user' : 'policy' },
      );
      if (!approved) {
        respond(
          createErrorResponse(
            request.id,
            'PowerShell execution denied by user approval',
            'APPROVAL_DENIED',
          ),
        );
        return;
      }
    }

    const { spawn } = await import('node:child_process');
    const timeout = request.timeout ?? 60000;

    return new Promise((resolve) => {
      const proc = spawn(
        'powershell',
        ['-NoProfile', '-Command', request.script],
        {
          cwd: this.resolvePath(request.cwd ?? this.workspacePath, {
            restrictToWorkspace: false,
          }),
          timeout,
        },
      );

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      void this.appendAuditEvent(
        'tool.execution_started',
        'windows-broker.powershell',
        request.id,
        reviewLevel,
        { kind: 'system' },
      );

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
        respond(createSuccessResponse(request.id, result));
        void this.appendAuditEvent(
          'tool.execution_finished',
          'windows-broker.powershell',
          request.id,
          reviewLevel,
          { kind: 'system' },
          ['tool_output'],
          undefined,
          {
            success: (code ?? 1) === 0,
            exitCode: code ?? -1,
          },
        );
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
        createErrorResponse(request.id, 'AMSI not available', 'AMSI_BLOCKED'),
      );
      return;
    }

    const result = native.amsiScanBuffer(request.content, request.filename);
    respond(createSuccessResponse(request.id, result));
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

    if (!this.brokerServer?.hasHandshake) {
      return { ok: false, error: 'Brain handshake not completed' };
    }

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
    const { spawn } = await import('node:child_process');

    // Parse command safely
    const { cmd, args } = this.parseCommand(command);

    return new Promise((resolve) => {
      const child = spawn(cmd, args, {
        cwd: this.resolvePath(options?.cwd || this.workspacePath),
        env: { ...process.env, ...options?.env },
        shell: false, // Enforce no shell
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (d) => (stdout += d));
      child.stderr?.on('data', (d) => (stderr += d));

      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 0,
        });
      });
    });
  }

  async spawn(
    command: string,
    options?: ExecutionOptions,
  ): Promise<RuntimeProcess> {
    const { spawn } = await import('node:child_process');

    // Parse command safely
    const { cmd, args } = this.parseCommand(command);

    return spawn(cmd, args, {
      cwd: this.resolvePath(options?.cwd || this.workspacePath),
      env: { ...process.env, ...options?.env },
      shell: false,
    }) as unknown as RuntimeProcess;
  }
}
