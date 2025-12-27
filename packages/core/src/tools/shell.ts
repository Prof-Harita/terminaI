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
import type { GenerativeModelAdapter } from '../brain/index.js';
import type { Config } from '../config/config.js';
import type { BrainAuthority } from '../config/brainAuthority.js';
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
import { classifyRisk } from '../safety/risk-classifier.js';
import { checkDestructive } from '../safety/built-in.js';
import { getResponseText } from '../utils/partUtils.js';
import {
  assessRisk,
  handleConfidence,
  logOutcome,
  routeExecution,
  type ConfidenceAction,
  type ExecutionDecision,
  type RiskAssessment,
} from '../brain/index.js';
import type {
  DeterministicReviewResult,
  ReviewLevel,
} from '../safety/approval-ladder/types.js';

export const OUTPUT_UPDATE_INTERVAL_MS = 1000;

interface BrainContext {
  assessment: RiskAssessment;
  decision: ExecutionDecision;
  confidenceAction: ConfidenceAction;
  request: string;
}

export interface ShellToolParams {
  command: string;
  description?: string;
  dir_path?: string;
}

export class ShellToolInvocation extends BaseToolInvocation<
  ShellToolParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: ShellToolParams,
    private readonly allowlist: Set<string>,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  private brainContext: BrainContext | null = null;

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
    const rootCommands = [...new Set(getCommandRoots(command))];
    const risk = classifyRisk(command);

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

    const commandsToConfirm = rootCommands.filter(
      (command) => !this.allowlist.has(command),
    );

    // Build deterministic action profile for approval ladder
    const { buildShellActionProfile } = await import(
      '../safety/approval-ladder/buildShellActionProfile.js'
    );
    const { computeMinimumReviewLevel } = await import(
      '../safety/approval-ladder/computeMinimumReviewLevel.js'
    );

    const invocationProvenance = this.getProvenance();
    const actionProfile = buildShellActionProfile({
      command: this.params.command,
      cwd: this.params.dir_path ?? process.cwd(),
      workspaces: [this.config.getWorkspaceContext().targetDir],
      provenance:
        invocationProvenance.length > 0 ? invocationProvenance : undefined,
    });

    const reviewResult = computeMinimumReviewLevel(actionProfile);
    let effectiveReview: DeterministicReviewResult = {
      ...reviewResult,
      reasons: [...reviewResult.reasons],
    };

    const brainAuthority = this.config.getBrainAuthority();
    let brainContext: BrainContext | null = null;
    if (reviewResult.level !== 'A' || brainAuthority !== 'advisory') {
      brainContext = await this.evaluateBrain(command);
      if (brainAuthority !== 'advisory') {
        effectiveReview = this.applyBrainAuthority(
          effectiveReview,
          brainContext,
          brainAuthority,
        );
      }
    }

    // Skip confirmation for Level A (no approval needed).
    if (effectiveReview.level === 'A') {
      return false;
    }

    const confirmationDetails: ToolExecuteConfirmationDetails = {
      type: 'exec',
      title: 'Confirm Shell Command (risk-aware)',
      command:
        brainContext?.decision.confirmationMessage && commandsToConfirm.length
          ? `${this.params.command}\n\n${brainContext.decision.confirmationMessage}`
          : (brainContext?.decision.confirmationMessage ?? this.params.command),
      rootCommand: commandsToConfirm.length
        ? commandsToConfirm.join(', ')
        : rootCommands.join(', '),
      risk,
      provenance:
        invocationProvenance.length > 0 ? invocationProvenance : undefined,
      reviewLevel: effectiveReview.level,
      requiresPin: effectiveReview.requiresPin,
      pinLength: effectiveReview.requiresPin ? 6 : undefined,
      explanation: effectiveReview.reasons.join('; '),
      onConfirm: async (
        outcome: ToolConfirmationOutcome,
        _payload?: { pin?: string },
      ) => {
        // Existing allowlist logic
        if (outcome === ToolConfirmationOutcome.ProceedAlways) {
          commandsToConfirm.forEach((command) => this.allowlist.add(command));
        }
        await this.publishPolicyUpdate(outcome);
      },
    };
    return confirmationDetails;
  }

  private async evaluateBrain(command: string): Promise<BrainContext | null> {
    if (this.brainContext) {
      return this.brainContext;
    }

    const request = this.params.description ?? command;
    const systemContext = this.params.dir_path ?? this.config.getTargetDir();
    const model = this.buildGenerativeModelAdapter();

    try {
      const assessment = await assessRisk(
        request,
        command,
        systemContext,
        model ?? undefined,
      );
      const decision = routeExecution(assessment);
      const confidenceAction = handleConfidence(
        assessment.dimensions.confidence,
        request,
      );
      this.brainContext = { assessment, decision, confidenceAction, request };
      return this.brainContext;
    } catch (error) {
      debugLogger.error(
        `Failed to run risk assessment: ${getErrorMessage(error)}`,
      );
      return null;
    }
  }

  private applyBrainAuthority(
    review: DeterministicReviewResult,
    brainContext: BrainContext | null,
    authority: BrainAuthority,
  ): DeterministicReviewResult {
    if (!brainContext) {
      return review;
    }

    const requiredLevel = this.getBrainReviewLevel(authority, brainContext);
    if (!requiredLevel) {
      return review;
    }

    if (this.isReviewLevelAtLeast(review.level, requiredLevel)) {
      return review;
    }

    const nextReasons = [
      ...review.reasons,
      `Brain risk assessment marked this as ${brainContext.assessment.overallRisk}; require ${requiredLevel} review.`,
    ];

    return {
      level: requiredLevel,
      reasons: nextReasons,
      requiresClick: requiredLevel !== 'A',
      requiresPin: requiredLevel === 'C',
    };
  }

  private getBrainReviewLevel(
    authority: BrainAuthority,
    brainContext: BrainContext,
  ): ReviewLevel | undefined {
    const risk = brainContext.assessment.overallRisk;

    if (authority === 'advisory') {
      return undefined;
    }

    if (authority === 'escalate-only') {
      if (!brainContext.decision.requiresConfirmation) {
        return undefined;
      }
      return risk === 'critical' ? 'C' : 'B';
    }

    if (risk === 'critical') {
      return 'C';
    }
    if (risk === 'elevated' || risk === 'normal') {
      return 'B';
    }

    return undefined;
  }

  private isReviewLevelAtLeast(
    current: ReviewLevel,
    required: ReviewLevel,
  ): boolean {
    const rank: Record<ReviewLevel, number> = { A: 0, B: 1, C: 2 };
    return rank[current] >= rank[required];
  }

  private buildGenerativeModelAdapter(): GenerativeModelAdapter | null {
    try {
      if (
        typeof (this.config as unknown as { getBaseLlmClient?: unknown })
          .getBaseLlmClient !== 'function'
      ) {
        return null;
      }

      const baseLlm = this.config.getBaseLlmClient();
      const abortController = new AbortController();
      const modelConfigKey = { model: this.config.getActiveModel() };

      return {
        generateContent: async (prompt: string) => {
          const response = await baseLlm.generateContent({
            modelConfigKey,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            abortSignal: abortController.signal,
            promptId: this.config.getSessionId(),
          });

          const text = getResponseText(response) ?? '';
          return {
            response: {
              text: () => text,
            },
          } as unknown as { response: { text: () => string } };
        },
      };
    } catch (error) {
      debugLogger.error(
        `Failed to build LLM adapter for risk assessment: ${getErrorMessage(error)}`,
      );
      return null;
    }
  }

  private formatRiskPreamble(context: BrainContext): {
    text: string;
    surfaceToUser: boolean;
  } {
    const { assessment, decision, confidenceAction } = context;
    const lines = [
      `Risk: ${assessment.overallRisk} (${assessment.reasoning})`,
      `Environment: ${assessment.dimensions.environment}`,
      `Suggested strategy: ${assessment.suggestedStrategy}`,
    ];

    if (decision.shouldWarn && decision.warningMessage) {
      lines.push(decision.warningMessage);
    }

    if (confidenceAction.type === 'narrate-uncertainty') {
      if (confidenceAction.message) {
        lines.push(confidenceAction.message);
      }
    }

    if (confidenceAction.type === 'diagnostic-first') {
      if (confidenceAction.message) {
        lines.push(confidenceAction.message);
      }
      if (confidenceAction.diagnosticCommand) {
        lines.push(`Diagnostic: ${confidenceAction.diagnosticCommand}`);
      }
    }

    if (confidenceAction.type === 'ask-clarification') {
      if (confidenceAction.clarificationQuestion) {
        lines.push(confidenceAction.clarificationQuestion);
      }
    }

    const surfaceToUser =
      decision.shouldWarn ||
      assessment.overallRisk !== 'trivial' ||
      confidenceAction.type !== 'proceed';
    return { text: lines.filter(Boolean).join('\n'), surfaceToUser };
  }

  private recordOutcome(
    context: BrainContext | null,
    command: string,
    outcome: 'success' | 'failure' | 'cancelled',
    errorMessage?: string,
  ): void {
    if (!context) {
      return;
    }

    try {
      logOutcome({
        timestamp: new Date().toISOString(),
        request: context.request,
        command,
        assessedRisk: context.assessment.overallRisk,
        actualOutcome: outcome,
        userApproved: true,
        errorMessage,
      });
    } catch (error) {
      debugLogger.error(
        `Failed to log shell outcome: ${getErrorMessage(error)}`,
      );
    }
  }

  async execute(
    signal: AbortSignal,
    updateOutput?: (output: string | AnsiOutput) => void,
    shellExecutionConfig?: ShellExecutionConfig,
    setPidCallback?: (pid: number) => void,
  ): Promise<ToolResult> {
    const strippedCommand = stripShellWrapper(this.params.command);
    const brainContext = this.brainContext;
    const applyRisk = (result: ToolResult): ToolResult => {
      if (!brainContext) {
        return result;
      }
      const { text, surfaceToUser } = this.formatRiskPreamble(brainContext);
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
      this.recordOutcome(brainContext, strippedCommand, 'cancelled');
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
      this.recordOutcome(brainContext, strippedCommand, 'cancelled', message);
      return applyRisk(result);
    }

    if (this.config.getPreviewMode()) {
      const result = {
        llmContent: `[PREVIEW] Would execute:\n$ ${this.params.command}\n\nIn directory: ${cwd}`,
        returnDisplay: `[PREVIEW] ${this.params.command}`,
      };
      this.recordOutcome(brainContext, strippedCommand, 'cancelled');
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

      if (brainContext) {
        const { text, surfaceToUser } = this.formatRiskPreamble(brainContext);
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
              type: ToolErrorType.SHELL_EXECUTE_ERROR,
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

      this.recordOutcome(
        brainContext,
        strippedCommand,
        outcome,
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
    return `This tool executes a given shell command as \`bash -c <command>\`. Command can start background processes using \`&\`. Command is executed as a subprocess that leads its own process group. Command process group can be terminated as \`kill -- -PGID\` or signaled as \`kill -s SIGNAL -- -PGID\`.${returnedInfo}`;
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

  private allowlist: Set<string> = new Set();

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
              '(OPTIONAL) The path of the directory to run the command in. If not provided, the project root directory is used. Must be a directory within the workspace and must already exist.',
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
      return commandCheck.reason;
    }
    if (getCommandRoots(params.command).length === 0) {
      return 'Could not identify command root to obtain permission from user.';
    }
    if (params.dir_path) {
      const resolvedPath = path.resolve(
        this.config.getTargetDir(),
        params.dir_path,
      );
      const workspaceContext = this.config.getWorkspaceContext();
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
      this.allowlist,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
