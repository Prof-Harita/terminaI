/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import os, { EOL } from 'node:os';
import crypto from 'node:crypto';

import type { Config } from '../config/config.js';

import { debugLogger, type AnyToolInvocation } from '../index.js';
import { ToolErrorType } from './tool-error.js';
import type {
  ToolInvocation,
  ToolResult,
  ToolCallConfirmationDetails,
  ToolExecuteConfirmationDetails,
} from './tools.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  ToolConfirmationOutcome,
  Kind,
  type PolicyUpdateOptions,
} from './tools.js';
import { ApprovalMode } from '../policy/types.js';

import { getErrorMessage } from '../utils/errors.js';
import { summarizeToolOutput } from '../utils/summarizer.js';
import type {
  ShellExecutionConfig,
  ShellOutputEvent,
} from '../services/shellExecutionService.js';
import { ShellExecutionService } from '../services/shellExecutionService.js';
import { formatMemoryUsage } from '../utils/formatters.js';
import type { AnsiOutput } from '../utils/terminalSerializer.js';
import {
  getCommandRoots,
  initializeShellParsers,
  stripShellWrapper,
} from '../utils/shell-utils.js';
import {
  isCommandAllowed,
  isShellInvocationAllowlisted,
} from '../utils/shell-permissions.js';
import { SHELL_TOOL_NAME } from './tool-names.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';

import { checkDestructive } from '../safety/built-in.js';

import type { DeterministicReviewResult } from '../safety/approval-ladder/types.js';
import { BrainRiskManager } from '../brain/toolIntegration.js';

export const OUTPUT_UPDATE_INTERVAL_MS = 1000;

export interface ShellToolParams {
  command: string;
  description?: string;
  dir_path?: string;
}

export class ShellToolInvocation extends BaseToolInvocation<
  ShellToolParams,
  ToolResult
> {
  private brainManager: BrainRiskManager;

  constructor(
    private readonly config: Config,
    params: ShellToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
    this.brainManager = new BrainRiskManager(this.config);
  }

  getDescription(): string {
    let description = `${this.params.command}`;
    // append optional [in directory]
    // note description is needed even if validation fails due to absolute path
    if (this.params.dir_path) {
      description += ` [in ${this.params.dir_path}]`;
    } else {
      description += ` [current working directory ${process.cwd()}]`;
    }
    // append optional (description), replacing any line breaks with spaces
    if (this.params.description) {
      description += ` (${this.params.description.replace(/\n/g, ' ')})`;
    }
    return description;
  }

  protected override getPolicyUpdateOptions(
    outcome: ToolConfirmationOutcome,
  ): PolicyUpdateOptions | undefined {
    if (outcome === ToolConfirmationOutcome.ProceedAlwaysAndSave) {
      return { commandPrefix: this.params.command };
    }
    return undefined;
  }

  protected override async getConfirmationDetails(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    const command = stripShellWrapper(this.params.command);

    // In non-interactive mode, we need to prevent the tool from hanging while
    // waiting for user input. If a tool is not fully allowed (e.g. via
    // --allowed-tools="ShellTool(wc)"), we should throw an error instead of
    // prompting for confirmation. This check is skipped in YOLO mode.
    if (
      !this.config.isInteractive() &&
      this.config.getApprovalMode() !== ApprovalMode.YOLO
    ) {
      if (this.isInvocationAllowlisted(command)) {
        // If it's an allowed shell command, we don't need to confirm execution.
        return false;
      }

      throw new Error(
        `Command "${command}" is not in the list of allowed tools for non-interactive mode.`,
      );
    }

    // Build deterministic action profile for approval ladder
    const { buildShellActionProfile } = await import(
      '../safety/approval-ladder/buildShellActionProfile.js'
    );
    const { computeMinimumReviewLevel } = await import(
      '../safety/approval-ladder/computeMinimumReviewLevel.js'
    );

    // Detect outside-workspace operation
    let outsideWorkspaceWarning: string | null = null;
    if (this.params.dir_path) {
      const resolvedPath = path.resolve(
        this.config.getTargetDir(),
        this.params.dir_path,
      );
      const workspaceContext = this.config.getWorkspaceContext();

      if (!workspaceContext.isPathWithinWorkspace(resolvedPath)) {
        outsideWorkspaceWarning = `Operating outside workspace: ${resolvedPath}`;
      }
    }

    const invocationProvenance = this.getProvenance();
    const actionProfile = buildShellActionProfile({
      command: this.params.command,
      cwd: this.params.dir_path ?? process.cwd(),
      workspaces: [this.config.getWorkspaceContext().targetDir],
      outsideWorkspace: outsideWorkspaceWarning !== null,
      provenance:
        invocationProvenance.length > 0 ? invocationProvenance : undefined,
    });

    const reviewResult = computeMinimumReviewLevel(actionProfile, this.config);
    let effectiveReview: DeterministicReviewResult = {
      ...reviewResult,
      reasons: [...reviewResult.reasons],
    };

    // Inject outside-workspace warning into reasons
    if (outsideWorkspaceWarning) {
      effectiveReview.reasons.unshift(outsideWorkspaceWarning);
      if (effectiveReview.level === 'A') {
        effectiveReview.level = 'B'; // Bump to at least level B
      }
    }

    const brainAuthority = this.config.getBrainAuthority();
    if (reviewResult.level !== 'A' || brainAuthority !== 'advisory') {
      const request = this.params.description ?? command;
      const systemContext = this.params.dir_path ?? this.config.getTargetDir();

      await this.brainManager.evaluateBrain(
        request,
        command,
        systemContext,
        _abortSignal,
      );

      if (brainAuthority !== 'advisory') {
        effectiveReview = this.brainManager.applyBrainAuthority(
          effectiveReview,
          brainAuthority,
        );
      }
    }

    if (effectiveReview.level === 'A') {
      return false;
    }

    const confirmationDetails: ToolExecuteConfirmationDetails = {
      type: 'exec',
      title: 'Confirm Execution',
      command,
      rootCommand: getCommandRoots(command)[0] || command,
      reviewLevel: effectiveReview.level,
      requiresPin: effectiveReview.requiresPin,
      pinLength: effectiveReview.requiresPin ? 6 : undefined,
      explanation: effectiveReview.reasons.join('; '),
      provenance: this.getProvenance(),
      onConfirm: async (outcome: ToolConfirmationOutcome) => {
        await this.publishPolicyUpdate(outcome);
      },
    };

    return confirmationDetails;
  }

  async execute(
    signal: AbortSignal,
    updateOutput?: (output: string | AnsiOutput) => void,
    shellExecutionConfig?: ShellExecutionConfig,
    setPidCallback?: (pid: number) => void,
  ): Promise<ToolResult> {
    const strippedCommand = stripShellWrapper(this.params.command);
    const applyRisk = (result: ToolResult): ToolResult => {
      if (!this.brainManager.getBrainContext()) {
        return result;
      }
      const { text, surfaceToUser } = this.brainManager.formatRiskPreamble();
      if (!text) {
        return result;
      }
      const llmContent =
        typeof result.llmContent === 'string'
          ? `${text}\n\n${result.llmContent}`
          : result.llmContent;
      const returnDisplay =
        surfaceToUser && typeof result.returnDisplay === 'string'
          ? `${text}\n\n${result.returnDisplay}`
          : result.returnDisplay;
      return { ...result, llmContent, returnDisplay };
    };

    if (signal.aborted) {
      const result = {
        llmContent: 'Command was cancelled by user before it could start.',
        returnDisplay: 'Command cancelled by user.',
      };
      this.brainManager.recordOutcome(strippedCommand, 'cancelled');
      return applyRisk(result);
    }

    const cwd = this.params.dir_path
      ? path.resolve(this.config.getTargetDir(), this.params.dir_path)
      : this.config.getTargetDir();
    const destructiveCheck = checkDestructive(strippedCommand);
    if (destructiveCheck.blocked) {
      const message = `Command blocked: ${destructiveCheck.reason}`;
      const result = {
        llmContent: message,
        returnDisplay: message,
        error: {
          message,
          type: ToolErrorType.PERMISSION_DENIED,
        },
      };
      this.brainManager.recordOutcome(
        strippedCommand,
        'cancelled',
        false,
        message,
      );
      return applyRisk(result);
    }

    if (this.config.getPreviewMode()) {
      const result = {
        llmContent: `[PREVIEW] Would execute:\n$ ${this.params.command}\n\nIn directory: ${cwd}`,
        returnDisplay: `[PREVIEW] ${this.params.command}`,
      };
      this.brainManager.recordOutcome(strippedCommand, 'cancelled');
      return applyRisk(result);
    }

    const isWindows = os.platform() === 'win32';
    const tempFileName = `shell_pgrep_${crypto
      .randomBytes(6)
      .toString('hex')}.tmp`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    const timeoutMs = this.config.getShellToolInactivityTimeout();
    const timeoutController = new AbortController();
    let timeoutTimer: NodeJS.Timeout | undefined;

    // Handle signal combination manually to avoid TS issues or runtime missing features
    const combinedController = new AbortController();

    const onAbort = () => combinedController.abort();

    try {
      // pgrep is not available on Windows, so we can't get background PIDs
      const commandToExecute = isWindows
        ? strippedCommand
        : (() => {
            // wrap command to append subprocess pids (via pgrep) to temporary file
            let command = strippedCommand.trim();
            if (!command.endsWith('&')) command += ';';
            return `{ ${command} }; __code=$?; pgrep -g 0 >${tempFilePath} 2>&1; exit $__code;`;
          })();

      let cumulativeOutput: string | AnsiOutput = '';
      let lastUpdateTime = Date.now();
      let isBinaryStream = false;

      const resetTimeout = () => {
        if (timeoutMs <= 0) {
          return;
        }
        if (timeoutTimer) clearTimeout(timeoutTimer);
        timeoutTimer = setTimeout(() => {
          timeoutController.abort();
        }, timeoutMs);
      };

      signal.addEventListener('abort', onAbort, { once: true });
      timeoutController.signal.addEventListener('abort', onAbort, {
        once: true,
      });

      // Start timeout
      resetTimeout();

      const { result: resultPromise, pid } =
        await ShellExecutionService.execute(
          commandToExecute,
          cwd,
          (event: ShellOutputEvent) => {
            resetTimeout(); // Reset timeout on any event
            if (!updateOutput) {
              return;
            }

            let shouldUpdate = false;

            switch (event.type) {
              case 'data':
                if (isBinaryStream) break;
                cumulativeOutput = event.chunk;
                shouldUpdate = true;
                break;
              case 'binary_detected':
                isBinaryStream = true;
                cumulativeOutput =
                  '[Binary output detected. Halting stream...]';
                shouldUpdate = true;
                break;
              case 'binary_progress':
                isBinaryStream = true;
                cumulativeOutput = `[Receiving binary output... ${formatMemoryUsage(
                  event.bytesReceived,
                )} received]`;
                if (Date.now() - lastUpdateTime > OUTPUT_UPDATE_INTERVAL_MS) {
                  shouldUpdate = true;
                }
                break;
              case 'interactive:password':
                // Password prompt detected - show indicator but don't blocking-prompt here.
                // The underlying pty will handle the actual input if pipe/pty is setup correctly,
                // or the user will see they need to provide input.
                cumulativeOutput = `[Password prompt detected: ${event.prompt}]`;
                shouldUpdate = true;
                break;
              case 'interactive:fullscreen':
                // TUI/fullscreen mode change - no action needed for output display update
                break;
              default: {
                const _exhaustiveCheck: never = event;
                throw new Error(
                  `An unhandled ShellOutputEvent was found: ${(_exhaustiveCheck as ShellOutputEvent).type}`,
                );
              }
            }

            if (shouldUpdate) {
              updateOutput(cumulativeOutput);
              lastUpdateTime = Date.now();
            }
          },
          combinedController.signal,
          this.config.getEnableInteractiveShell(),
          { ...shellExecutionConfig, pager: 'cat' },
          this.config.getRuntimeContext(), // Pass RuntimeContext
        );

      if (pid && setPidCallback) {
        setPidCallback(pid);
      }

      const result = await resultPromise;

      const backgroundPIDs: number[] = [];
      if (os.platform() !== 'win32') {
        if (fs.existsSync(tempFilePath)) {
          const pgrepLines = fs
            .readFileSync(tempFilePath, 'utf8')
            .split(EOL)
            .filter(Boolean);
          for (const line of pgrepLines) {
            if (!/^\d+$/.test(line)) {
              debugLogger.error(`pgrep: ${line}`);
            }
            const pid = Number(line);
            if (pid !== result.pid) {
              backgroundPIDs.push(pid);
            }
          }
        } else {
          if (!signal.aborted) {
            debugLogger.error('missing pgrep output');
          }
        }
      }

      let llmContent = '';
      let timeoutMessage = '';
      if (result.aborted) {
        if (timeoutController.signal.aborted) {
          timeoutMessage = `Command was automatically cancelled because it exceeded the timeout of ${(
            timeoutMs / 60000
          ).toFixed(1)} minutes without output.`;
          llmContent = timeoutMessage;
        } else {
          llmContent =
            'Command was cancelled by user before it could complete.';
        }
        if (result.output.trim()) {
          llmContent += ` Below is the output before it was cancelled:\n${result.output}`;
        } else {
          llmContent += ' There was no output before it was cancelled.';
        }
      } else {
        // Create a formatted error string for display, replacing the wrapper command
        // with the user-facing command.
        const finalError = result.error
          ? result.error.message.replace(commandToExecute, this.params.command)
          : '(none)';

        llmContent = [
          `Command: ${this.params.command}`,
          `Directory: ${this.params.dir_path || '(root)'}`,
          `Output: ${result.output || '(empty)'}`,
          `Error: ${finalError}`, // Use the cleaned error string.
          `Exit Code: ${result.exitCode ?? '(none)'}`,
          `Signal: ${result.signal ?? '(none)'}`,
          `Background PIDs: ${
            backgroundPIDs.length ? backgroundPIDs.join(', ') : '(none)'
          }`,
          `Process Group PGID: ${result.pid ?? '(none)'}`,
        ].join('\n');
      }

      let returnDisplayMessage = '';
      if (this.config.getDebugMode()) {
        returnDisplayMessage = llmContent;
      } else {
        if (result.output.trim()) {
          returnDisplayMessage = result.output;
        } else {
          if (result.aborted) {
            if (timeoutMessage) {
              returnDisplayMessage = timeoutMessage;
            } else {
              returnDisplayMessage = 'Command cancelled by user.';
            }
          } else if (result.signal) {
            returnDisplayMessage = `Command terminated by signal: ${result.signal}`;
          } else if (result.error) {
            returnDisplayMessage = `Command failed: ${getErrorMessage(
              result.error,
            )}`;
          } else if (result.exitCode !== null && result.exitCode !== 0) {
            returnDisplayMessage = `Command exited with code: ${result.exitCode}`;
          }
          // If output is empty and command succeeded (code 0, no error/signal/abort),
          // returnDisplayMessage will remain empty, which is fine.
        }
      }

      if (this.brainManager.getBrainContext()) {
        const { text, surfaceToUser } = this.brainManager.formatRiskPreamble();
        if (text) {
          llmContent = `${text}\n\n${llmContent}`;
          if (surfaceToUser) {
            returnDisplayMessage = returnDisplayMessage
              ? `${text}\n\n${returnDisplayMessage}`
              : text;
          }
        }
      }

      const summarizeConfig = this.config.getSummarizeToolOutputConfig();
      const executionError = result.error
        ? {
            error: {
              message: result.error.message,
              type: this.attributeErrorType(result.error.message),
            },
          }
        : {};
      if (summarizeConfig && summarizeConfig[SHELL_TOOL_NAME]) {
        const summary = await summarizeToolOutput(
          this.config,
          { model: 'summarizer-shell' },
          llmContent,
          this.config.getGeminiClient(),
          signal,
        );
        llmContent = summary;
      }

      const outcome: 'success' | 'failure' | 'cancelled' = result.aborted
        ? 'cancelled'
        : result.exitCode && result.exitCode !== 0
          ? 'failure'
          : result.error
            ? 'failure'
            : 'success';

      this.brainManager.recordOutcome(
        strippedCommand,
        outcome,
        outcome !== 'cancelled',
        (result.error?.message ?? timeoutMessage) || undefined,
      );

      return {
        llmContent,
        returnDisplay: returnDisplayMessage,
        ...executionError,
      };
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      signal.removeEventListener('abort', onAbort);
      timeoutController.signal.removeEventListener('abort', onAbort);
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  private isInvocationAllowlisted(command: string): boolean {
    const allowedTools = this.config.getAllowedTools() || [];
    if (allowedTools.length === 0) {
      return false;
    }

    const invocation = { params: { command } } as unknown as AnyToolInvocation;
    return isShellInvocationAllowlisted(invocation, allowedTools);
  }

  private attributeErrorType(message: string): ToolErrorType {
    if (
      message.includes('OCI runtime exec failed') ||
      message.includes('error during container execution')
    ) {
      return ToolErrorType.CONTAINER_RUNTIME_ERROR;
    }
    if (message.includes('MicroVM runtime error')) {
      return ToolErrorType.MICROVM_RUNTIME_ERROR;
    }
    return ToolErrorType.SHELL_EXECUTE_ERROR;
  }
}

function getShellToolDescription(): string {
  const returnedInfo = `

      The following information is returned:

      Command: Executed command.
      Directory: Directory where command was executed, or \`(root)\`.
      Stdout: Output on stdout stream. Can be \`(empty)\` or partial on error and for any unwaited background processes.
      Stderr: Output on stderr stream. Can be \`(empty)\` or partial on error and for any unwaited background processes.
      Error: Error or \`(none)\` if no error was reported for the subprocess.
      Exit Code: Exit code or \`(none)\` if terminated by signal.
      Signal: Signal number or \`(none)\` if no signal was received.
      Background PIDs: List of background processes started or \`(none)\`.
      Process Group PGID: Process group started or \`(none)\``;

  if (os.platform() === 'win32') {
    return `This tool executes a given shell command as \`powershell.exe -NoProfile -Command <command>\`. Command can start background processes using PowerShell constructs such as \`Start-Process -NoNewWindow\` or \`Start-Job\`.${returnedInfo}`;
  } else {
    return `This tool executes a given shell command as \`bash -c <command>\`. Use this tool to perform system discovery (e.g., checking available printers via \`lpstat\`, listing hardware), manage files, or run scripts. Command can start background processes using \`&\`. Command is executed as a subprocess that leads its own process group. Command process group can be terminated as \`kill -- -PGID\` or signaled as \`kill -s SIGNAL -- -PGID\`.${returnedInfo}`;
  }
}

function getCommandDescription(): string {
  if (os.platform() === 'win32') {
    return 'Exact command to execute as `powershell.exe -NoProfile -Command <command>`';
  } else {
    return 'Exact bash command to execute as `bash -c <command>`';
  }
}

export class ShellTool extends BaseDeclarativeTool<
  ShellToolParams,
  ToolResult
> {
  static readonly Name = SHELL_TOOL_NAME;

  constructor(
    private readonly config: Config,
    messageBus?: MessageBus,
  ) {
    void initializeShellParsers().catch(() => {
      // Errors are surfaced when parsing commands.
    });
    super(
      ShellTool.Name,
      'Shell',
      getShellToolDescription(),
      Kind.Execute,
      {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: getCommandDescription(),
          },
          description: {
            type: 'string',
            description:
              'Brief description of the command for the user. Be specific and concise. Ideally a single sentence. Can be up to 3 sentences for clarity. No line breaks.',
          },
          dir_path: {
            type: 'string',
            description:
              '(OPTIONAL) The path of the directory to run the command in. If not provided, the workspace root directory is used. Must be a directory within the workspace and must already exist.',
          },
        },
        required: ['command'],
      },
      false, // output is not markdown
      true, // output can be updated
      messageBus,
    );
  }

  protected override validateToolParamValues(
    params: ShellToolParams,
  ): string | null {
    if (!params.command.trim()) {
      return 'Command cannot be empty.';
    }

    const commandCheck = isCommandAllowed(params.command, this.config);
    if (!commandCheck.allowed) {
      if (!commandCheck.reason) {
        debugLogger.error(
          'Unexpected: isCommandAllowed returned false without a reason',
        );
        return `Command is not allowed: ${params.command}`;
      }
      // If it's a hard denial (e.g. blocklist), fail validation.
      // If it's a soft denial (e.g. parsing error), proceed to confirmation flow.
      if (commandCheck.isHardDenial !== false) {
        return commandCheck.reason;
      }
    }
    // We no longer strictly block empty roots here. If parsing fails, we treat it as
    // an "unknown" command which will trigger a high-risk review in getConfirmationDetails.
    // This enables "Fail Safe" behavior (ask user) instead of "Fail Stop" (crash/block).
    if (params.dir_path) {
      const resolvedPath = path.resolve(
        this.config.getTargetDir(),
        params.dir_path,
      );
      const workspaceContext = this.config.getWorkspaceContext();

      // NEW: System Operator mode allows common user directories
      if (this.config.isSystemOperatorMode()) {
        const ALLOWED_SYSTEM_PATHS = [
          os.homedir(), // ~/
          path.join(os.homedir(), 'Downloads'), // ~/Downloads
          path.join(os.homedir(), 'Documents'), // ~/Documents
          path.join(os.homedir(), 'Desktop'), // ~/Desktop
          os.tmpdir(), // /tmp or C:\Temp
          path.join(os.homedir(), 'Archives'), // ~/Archives
        ];

        const isAllowedSystemPath = ALLOWED_SYSTEM_PATHS.some(
          (allowed) =>
            resolvedPath === allowed ||
            resolvedPath.startsWith(allowed + path.sep),
        );

        if (isAllowedSystemPath) {
          return null; // Allow execution, confirmation will gate risk
        }
      }

      if (!workspaceContext.isPathWithinWorkspace(resolvedPath)) {
        return `Directory '${resolvedPath}' is not within any of the registered workspace directories.`;
      }
    }
    return null;
  }

  protected createInvocation(
    params: ShellToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ShellToolParams, ToolResult> {
    return new ShellToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
