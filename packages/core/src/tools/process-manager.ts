/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import type { Config } from '../config/config.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type {
  ShellExecutionConfig,
  ShellExecutionResult,
  ShellOutputEvent,
} from '../services/shellExecutionService.js';
import { ShellExecutionService } from '../services/shellExecutionService.js';
import { formatMemoryUsage } from '../utils/formatters.js';
import type { AnsiOutput } from '../utils/terminalSerializer.js';
import {
  escapeShellArg,
  getCommandRoots,
  getShellConfiguration,
  initializeShellParsers,
  isWindows,
} from '../utils/shell-utils.js';
import { isCommandAllowed } from '../utils/shell-permissions.js';
import { getErrorMessage } from '../utils/errors.js';
import type {
  ToolCallConfirmationDetails,
  ToolExecuteConfirmationDetails,
  ToolInvocation,
  ToolResult,
  ToolConfirmationOutcome,
} from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolErrorType } from './tool-error.js';
import { PROCESS_MANAGER_TOOL_NAME } from './tool-names.js';
import {
  sessionNotifier,
  type SessionEventType,
} from './process-notifications.js';

const MAX_OUTPUT_LINES = 1000;
const DEFAULT_READ_LINES = 50;
const RESTART_TIMEOUT_MS = 5000;
const ALLOWED_SIGNALS = new Set<NodeJS.Signals>([
  'SIGINT',
  'SIGTERM',
  'SIGKILL',
]);

export type ProcessManagerOperation =
  | 'start'
  | 'list'
  | 'status'
  | 'read'
  | 'send'
  | 'signal'
  | 'stop'
  | 'restart'
  | 'summarize';

export type ProcessManagerSignal = 'SIGINT' | 'SIGTERM' | 'SIGKILL';

export interface ProcessManagerToolParams {
  operation: ProcessManagerOperation;
  name?: string;
  command?: string;
  cwd?: string;
  env?: Record<string, string>;
  background?: boolean;
  lines?: number;
  text?: string;
  signal?: ProcessManagerSignal;
}

type SessionStatus = 'running' | 'exited' | 'error';

interface ProcessSession {
  name: string;
  command: string;
  cwd: string;
  env?: Record<string, string>;
  background: true;
  startedAt: number;
  lastOutputAt?: number;
  status: SessionStatus;
  pid?: number;
  exitCode?: number | null;
  signal?: number | null;
  executionMethod?: ShellExecutionResult['executionMethod'];
  outputLines: string[];
  pendingLine: string;
  hasOutput: boolean;
  resultPromise?: Promise<ShellExecutionResult>;
  abortController: AbortController;
}

interface SessionSummary {
  name: string;
  status: SessionStatus;
  pid?: number;
  command: string;
  cwd: string;
  startedAt: string;
  lastOutputAt?: string;
  exitCode?: number | null;
  signal?: number | null;
  outputLineCount: number;
  executionMethod?: ShellExecutionResult['executionMethod'];
}

class ProcessManagerState {
  readonly sessions = new Map<string, ProcessSession>();
}

const sharedProcessManagerState = new ProcessManagerState();

export const getSharedProcessManagerState = (): ProcessManagerState =>
  sharedProcessManagerState;

const normalizeLines = (lines: string[], maxLines: number): string[] => {
  if (lines.length <= maxLines) {
    return lines;
  }
  return lines.slice(lines.length - maxLines);
};

const appendLines = (
  existing: string[],
  incoming: string[],
  maxLines: number,
): string[] => normalizeLines(existing.concat(incoming), maxLines);

const ansiOutputToLines = (output: AnsiOutput): string[] =>
  output.map((line) =>
    line
      .map((token) => token.text)
      .join('')
      .trimEnd(),
  );

const buildSessionSummary = (session: ProcessSession): SessionSummary => ({
  name: session.name,
  status: session.status,
  pid: session.pid,
  command: session.command,
  cwd: session.cwd,
  startedAt: new Date(session.startedAt).toISOString(),
  lastOutputAt: session.lastOutputAt
    ? new Date(session.lastOutputAt).toISOString()
    : undefined,
  exitCode: session.exitCode ?? null,
  signal: session.signal ?? null,
  outputLineCount: session.outputLines.length + (session.pendingLine ? 1 : 0),
  executionMethod: session.executionMethod,
});

const getEnvPrefix = (command: string, env: Record<string, string>): string => {
  const entries = Object.entries(env);
  if (entries.length === 0) {
    return command;
  }

  const { shell } = getShellConfiguration();
  if (shell === 'powershell') {
    const assignments = entries.map(
      ([key, value]) => `$env:${key}=${escapeShellArg(value, shell)}`,
    );
    return `${assignments.join('; ')}; ${command}`;
  }

  const assignments = entries.map(
    ([key, value]) => `${key}=${escapeShellArg(value, shell)}`,
  );
  return `env ${assignments.join(' ')} ${command}`;
};

const sendSignal = (pid: number, signal: ProcessManagerSignal): void => {
  if (isWindows()) {
    process.kill(pid, signal);
    return;
  }

  try {
    process.kill(-pid, signal);
  } catch {
    process.kill(pid, signal);
  }
};

export class ProcessManager {
  constructor(
    private readonly config: Config,
    private readonly state: ProcessManagerState,
  ) {}

  private errorResult(
    message: string,
    type = ToolErrorType.EXECUTION_FAILED,
  ): ToolResult {
    return {
      llmContent: `Error: ${message}`,
      returnDisplay: message,
      error: {
        message,
        type,
      },
    };
  }

  private resolveCwd(cwd?: string): string {
    if (!cwd) {
      return this.config.getTargetDir();
    }

    return path.resolve(this.config.getTargetDir(), cwd);
  }

  private buildShellExecutionConfig(): ShellExecutionConfig {
    const baseConfig = this.config.getShellExecutionConfig();
    return {
      ...baseConfig,
      pager: 'cat',
      terminalHeight: MAX_OUTPUT_LINES,
      scrollback: MAX_OUTPUT_LINES,
    };
  }

  private handleOutputEvent(session: ProcessSession, event: ShellOutputEvent) {
    session.lastOutputAt = Date.now();
    session.hasOutput = true;

    if (event.type === 'data') {
      if (typeof event.chunk === 'string') {
        this.appendTextOutput(session, event.chunk);
      } else {
        const lines = ansiOutputToLines(event.chunk);
        session.outputLines = normalizeLines(lines, MAX_OUTPUT_LINES);
        session.pendingLine = '';
      }
      return;
    }

    if (event.type === 'binary_detected') {
      this.appendTextOutput(
        session,
        '[Binary output detected. Halting stream...]',
      );
      return;
    }

    const message = `[Receiving binary output... ${formatMemoryUsage(
      event.bytesReceived,
    )} received]`;

    if (
      session.outputLines.length > 0 &&
      session.outputLines[session.outputLines.length - 1].startsWith(
        '[Receiving binary output...',
      )
    ) {
      session.outputLines[session.outputLines.length - 1] = message;
    } else {
      session.outputLines = appendLines(
        session.outputLines,
        [message],
        MAX_OUTPUT_LINES,
      );
    }
  }

  private appendTextOutput(session: ProcessSession, text: string) {
    if (!text) {
      return;
    }

    const chunks = text.split(/\r?\n/);
    const hasTrailingNewline = text.endsWith('\n') || text.endsWith('\r\n');
    const lines = [...chunks];

    if (session.pendingLine) {
      lines[0] = `${session.pendingLine}${lines[0] ?? ''}`;
      session.pendingLine = '';
    }

    if (!hasTrailingNewline) {
      session.pendingLine = lines.pop() ?? '';
    }

    if (lines.length === 0) {
      return;
    }

    session.outputLines = appendLines(
      session.outputLines,
      lines,
      MAX_OUTPUT_LINES,
    );
  }

  async startSession(params: {
    name: string;
    command: string;
    cwd?: string;
    env?: Record<string, string>;
  }): Promise<ToolResult> {
    const name = params.name.trim();
    const command = params.command.trim();
    const resolvedCwd = this.resolveCwd(params.cwd);

    if (this.state.sessions.has(name)) {
      return this.errorResult(`Session "${name}" already exists.`);
    }

    const abortController = new AbortController();
    const session: ProcessSession = {
      name,
      command,
      cwd: resolvedCwd,
      env: params.env,
      background: true,
      startedAt: Date.now(),
      status: 'running',
      outputLines: [],
      pendingLine: '',
      hasOutput: false,
      abortController,
    };

    this.state.sessions.set(name, session);
    this.notify('started', session, `Session "${name}" started.`);

    try {
      const commandToExecute = params.env
        ? getEnvPrefix(command, params.env)
        : command;

      const handle = await ShellExecutionService.execute(
        commandToExecute,
        resolvedCwd,
        (event) => this.handleOutputEvent(session, event),
        abortController.signal,
        this.config.getEnableInteractiveShell(),
        this.buildShellExecutionConfig(),
      );

      session.pid = handle.pid;
      session.resultPromise = handle.result;

      handle.result
        .then((result) => {
          session.exitCode = result.exitCode;
          session.signal = result.signal;
          session.executionMethod = result.executionMethod;
          session.status = result.error ? 'error' : 'exited';
          if (!session.hasOutput && result.output) {
            this.appendTextOutput(session, result.output);
          }
          this.notify(
            result.error ? 'crashed' : 'finished',
            session,
            result.error
              ? `Session "${session.name}" crashed (exit ${result.exitCode ?? 'unknown'}).`
              : `Session "${session.name}" finished with code ${result.exitCode ?? 0}.`,
          );
        })
        .catch((error) => {
          session.status = 'error';
          this.appendTextOutput(
            session,
            `Process error: ${getErrorMessage(error)}`,
          );
          this.notify(
            'crashed',
            session,
            `Session "${session.name}" crashed: ${getErrorMessage(error)}`,
          );
        });

      return {
        llmContent: JSON.stringify(
          { status: 'started', session: buildSessionSummary(session) },
          null,
          2,
        ),
        returnDisplay: `Started session "${name}".`,
      };
    } catch (error) {
      this.state.sessions.delete(name);
      return this.errorResult(
        `Failed to start session "${name}": ${getErrorMessage(error)}`,
      );
    }
  }

  listSessions(): ToolResult {
    const sessions = [...this.state.sessions.values()].map(buildSessionSummary);
    return {
      llmContent: JSON.stringify({ sessions }, null, 2),
      returnDisplay: sessions.length
        ? `Found ${sessions.length} session(s).`
        : 'No sessions found.',
    };
  }

  getStatus(name: string): ToolResult {
    const session = this.state.sessions.get(name.trim());
    if (!session) {
      return this.errorResult(`Session "${name}" does not exist.`);
    }

    return {
      llmContent: JSON.stringify(
        { session: buildSessionSummary(session) },
        null,
        2,
      ),
      returnDisplay: `Status for "${session.name}": ${session.status}.`,
    };
  }

  readOutput(name: string, lines?: number): ToolResult {
    const session = this.state.sessions.get(name.trim());
    if (!session) {
      return this.errorResult(`Session "${name}" does not exist.`);
    }

    const lineCount = Math.max(1, Math.floor(lines ?? DEFAULT_READ_LINES));
    const linesToRead = Math.min(lineCount, MAX_OUTPUT_LINES);
    const outputLines = session.pendingLine
      ? session.outputLines.concat(session.pendingLine)
      : session.outputLines;
    const output = normalizeLines(outputLines, linesToRead).join('\n');

    if (!output.trim()) {
      return {
        llmContent: 'No output captured yet.',
        returnDisplay: 'No output captured yet.',
      };
    }

    return {
      llmContent: output,
      returnDisplay: output,
    };
  }

  summarizeOutput(name: string, lines?: number): ToolResult {
    const session = this.state.sessions.get(name.trim());
    if (!session) {
      return this.errorResult(`Session "${name}" does not exist.`);
    }

    const requestedLines = Math.max(1, Math.floor(lines ?? DEFAULT_READ_LINES));
    const linesToRead = Math.min(requestedLines, MAX_OUTPUT_LINES);
    const outputLines = session.pendingLine
      ? session.outputLines.concat(session.pendingLine)
      : session.outputLines;
    const normalized = normalizeLines(outputLines, linesToRead);
    const finalLines =
      normalized.length === 0 && outputLines.length > 0
        ? outputLines.slice(-linesToRead)
        : normalized;
    const outputText =
      finalLines.join('\n') || outputLines.join('\n') || 'No output captured.';
    const returnDisplayText =
      finalLines.slice(-5).filter(Boolean).join('\n') ||
      outputLines.slice(-5).filter(Boolean).join('\n') ||
      'No output captured.';

    return {
      llmContent: `Session "${name}" — last ${requestedLines} lines:\n\n${outputText}\n\nSummarize key events, errors, readiness signals, and current state in 3-5 bullet points.`,
      returnDisplay: returnDisplayText,
    };
  }

  sendInput(name: string, text: string): ToolResult {
    const session = this.state.sessions.get(name.trim());
    if (!session) {
      return this.errorResult(`Session "${name}" does not exist.`);
    }

    if (!session.pid || !ShellExecutionService.isPtyActive(session.pid)) {
      return this.errorResult(
        `Session "${session.name}" does not have an active PTY to receive input.`,
      );
    }

    ShellExecutionService.writeToPty(session.pid, text);
    return {
      llmContent: `Sent input to "${session.name}".`,
      returnDisplay: `Sent input to "${session.name}".`,
    };
  }

  signalSession(name: string, signal: ProcessManagerSignal): ToolResult {
    const session = this.state.sessions.get(name.trim());
    if (!session) {
      return this.errorResult(`Session "${name}" does not exist.`);
    }

    if (!session.pid) {
      return this.errorResult(
        `Session "${session.name}" does not have a PID available for signaling.`,
      );
    }

    try {
      sendSignal(session.pid, signal);
      return {
        llmContent: `Sent ${signal} to "${session.name}".`,
        returnDisplay: `Sent ${signal} to "${session.name}".`,
      };
    } catch (error) {
      return this.errorResult(
        `Failed to signal "${session.name}": ${getErrorMessage(error)}`,
      );
    }
  }

  stopSession(name: string, signal: ProcessManagerSignal): ToolResult {
    if (!ALLOWED_SIGNALS.has(signal)) {
      return this.errorResult(`Unsupported signal: ${signal}`);
    }

    const session = this.state.sessions.get(name.trim());
    if (!session) {
      return this.errorResult(`Session "${name}" does not exist.`);
    }

    if (!session.pid) {
      session.abortController.abort();
      return {
        llmContent: `Stop requested for "${session.name}".`,
        returnDisplay: `Stop requested for "${session.name}".`,
      };
    }

    try {
      sendSignal(session.pid, signal);
      return {
        llmContent: `Stop requested for "${session.name}" with ${signal}.`,
        returnDisplay: `Stop requested for "${session.name}".`,
      };
    } catch (error) {
      return this.errorResult(
        `Failed to stop "${session.name}": ${getErrorMessage(error)}`,
      );
    }
  }

  async restartSession(
    name: string,
    signal: ProcessManagerSignal,
  ): Promise<ToolResult> {
    const session = this.state.sessions.get(name.trim());
    if (!session) {
      return this.errorResult(`Session "${name}" does not exist.`);
    }

    if (!ALLOWED_SIGNALS.has(signal)) {
      return this.errorResult(`Unsupported signal: ${signal}`);
    }

    if (session.pid) {
      try {
        sendSignal(session.pid, signal);
      } catch (error) {
        return this.errorResult(
          `Failed to stop "${session.name}" before restart: ${getErrorMessage(
            error,
          )}`,
        );
      }
    } else {
      session.abortController.abort();
    }

    if (session.resultPromise) {
      const stopped = await Promise.race([
        session.resultPromise.then(() => true),
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), RESTART_TIMEOUT_MS),
        ),
      ]);

      if (!stopped) {
        return this.errorResult(
          `Timed out waiting for "${session.name}" to stop.`,
        );
      }
    }

    this.state.sessions.delete(session.name);
    return this.startSession({
      name: session.name,
      command: session.command,
      cwd: session.cwd,
      env: session.env,
    });
  }

  private notify(
    type: SessionEventType,
    session: ProcessSession,
    message: string,
  ) {
    sessionNotifier.notify({
      type,
      sessionName: session.name,
      message,
      timestamp: Date.now(),
    });
  }
}

class ProcessManagerToolInvocation extends BaseToolInvocation<
  ProcessManagerToolParams,
  ToolResult
> {
  constructor(
    private readonly processManager: ProcessManager,
    params: ProcessManagerToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    switch (this.params.operation) {
      case 'start':
        return `Start session "${this.params.name}" with command: ${this.params.command}`;
      case 'list':
        return 'List process sessions';
      case 'status':
        return `Get status for session "${this.params.name}"`;
      case 'read':
        return `Read output from session "${this.params.name}"`;
      case 'send':
        return `Send input to session "${this.params.name}"`;
      case 'signal':
        return `Send signal ${this.params.signal} to session "${this.params.name}"`;
      case 'stop':
        return `Stop session "${this.params.name}"`;
      case 'restart':
        return `Restart session "${this.params.name}"`;
      case 'summarize':
        return `Summarize recent output for session "${this.params.name}"`;
      default:
        return 'Manage process sessions';
    }
  }

  protected override async getConfirmationDetails(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    if (
      this.params.operation !== 'stop' &&
      this.params.operation !== 'signal' &&
      this.params.operation !== 'restart'
    ) {
      return false;
    }

    const signal =
      this.params.operation === 'signal'
        ? this.params.signal
        : (this.params.signal ?? 'SIGTERM');

    const command = `${this.params.operation} ${this.params.name}${
      signal ? ` ${signal}` : ''
    }`;

    const confirmationDetails: ToolExecuteConfirmationDetails = {
      type: 'exec',
      title: 'Confirm Process Action',
      command,
      rootCommand: this.params.operation,
      onConfirm: async (outcome: ToolConfirmationOutcome) => {
        await this.publishPolicyUpdate(outcome);
      },
    };
    return confirmationDetails;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    switch (this.params.operation) {
      case 'start':
        return this.processManager.startSession({
          name: (this.params.name ?? '').trim(),
          command: (this.params.command ?? '').trim(),
          cwd: this.params.cwd,
          env: this.params.env,
        });
      case 'list':
        return this.processManager.listSessions();
      case 'status':
        return this.processManager.getStatus((this.params.name ?? '').trim());
      case 'read':
        return this.processManager.readOutput(
          (this.params.name ?? '').trim(),
          this.params.lines,
        );
      case 'send':
        return this.processManager.sendInput(
          (this.params.name ?? '').trim(),
          this.params.text ?? '',
        );
      case 'signal':
        return this.processManager.signalSession(
          (this.params.name ?? '').trim(),
          this.params.signal ?? 'SIGTERM',
        );
      case 'stop':
        return this.processManager.stopSession(
          (this.params.name ?? '').trim(),
          this.params.signal ?? 'SIGTERM',
        );
      case 'restart':
        return this.processManager.restartSession(
          (this.params.name ?? '').trim(),
          this.params.signal ?? 'SIGTERM',
        );
      case 'summarize':
        return this.processManager.summarizeOutput(
          (this.params.name ?? '').trim(),
          this.params.lines,
        );
      default:
        return {
          llmContent: `Error: Unsupported operation: ${this.params.operation}`,
          returnDisplay: `Unsupported operation: ${this.params.operation}`,
          error: {
            message: `Unsupported operation: ${this.params.operation}`,
            type: ToolErrorType.EXECUTION_FAILED,
          },
        };
    }
  }
}

export class ProcessManagerTool extends BaseDeclarativeTool<
  ProcessManagerToolParams,
  ToolResult
> {
  static readonly Name = PROCESS_MANAGER_TOOL_NAME;

  private readonly processManager: ProcessManager;

  constructor(
    private readonly config: Config,
    messageBus?: MessageBus,
    state: ProcessManagerState = sharedProcessManagerState,
  ) {
    super(
      ProcessManagerTool.Name,
      'ProcessManager',
      'Manage named process sessions (start/list/status/read/send/signal/stop/restart/summarize). Start requires background=true.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: [
              'start',
              'list',
              'status',
              'read',
              'send',
              'signal',
              'stop',
              'restart',
              'summarize',
            ],
            description: 'The process manager operation to perform.',
          },
          name: {
            type: 'string',
            description: 'Name of the session to operate on.',
          },
          command: {
            type: 'string',
            description: 'Command to run for start.',
          },
          cwd: {
            type: 'string',
            description: 'Optional working directory for start.',
          },
          env: {
            type: 'object',
            description: 'Optional environment variables for start.',
            additionalProperties: { type: 'string' },
          },
          background: {
            type: 'boolean',
            description: 'Must be true to start a background session.',
          },
          lines: {
            type: 'integer',
            description: 'Optional number of lines to read from output.',
          },
          text: {
            type: 'string',
            description: 'Text to send to the process stdin.',
          },
          signal: {
            type: 'string',
            enum: ['SIGINT', 'SIGTERM', 'SIGKILL'],
            description: 'Signal to send to the process.',
          },
        },
        required: ['operation'],
      },
      false,
      false,
      messageBus,
    );
    void initializeShellParsers().catch(() => {
      // Errors are surfaced when parsing commands.
    });
    this.processManager = new ProcessManager(config, state);
  }

  protected override validateToolParamValues(
    params: ProcessManagerToolParams,
  ): string | null {
    const operation = params.operation;
    const needsName = operation !== 'list';

    if (needsName && (!params.name || !params.name.trim())) {
      return "The 'name' parameter must be provided for this operation.";
    }

    if (operation === 'start') {
      if (!params.command || !params.command.trim()) {
        return "The 'command' parameter must be provided for start.";
      }
      if (params.background !== true) {
        return "The 'background' parameter must be set to true to start a session.";
      }

      const commandCheck = isCommandAllowed(params.command, this.config);
      if (!commandCheck.allowed) {
        return (
          commandCheck.reason ?? `Command is not allowed: ${params.command}`
        );
      }
      if (getCommandRoots(params.command).length === 0) {
        return 'Could not identify command root to obtain permission from user.';
      }
      if (params.cwd) {
        const resolvedPath = path.resolve(
          this.config.getTargetDir(),
          params.cwd,
        );
        const workspaceContext = this.config.getWorkspaceContext();
        if (!workspaceContext.isPathWithinWorkspace(resolvedPath)) {
          return `Directory '${resolvedPath}' is not within any of the registered workspace directories.`;
        }
      }

      if (params.env) {
        for (const [key, value] of Object.entries(params.env)) {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
            return `Invalid environment variable name: ${key}`;
          }
          if (typeof value !== 'string') {
            return `Environment variable "${key}" must be a string.`;
          }
        }
      }
    }

    if (
      (operation === 'read' || operation === 'summarize') &&
      params.lines !== undefined
    ) {
      if (!Number.isFinite(params.lines) || params.lines <= 0) {
        return "The 'lines' parameter must be a positive integer.";
      }
    }

    if (operation === 'send') {
      if (!params.text) {
        return "The 'text' parameter must be provided for send.";
      }
    }

    if (operation === 'signal' && !params.signal) {
      return "The 'signal' parameter must be provided for signal.";
    }

    if (
      (operation === 'signal' ||
        operation === 'stop' ||
        operation === 'restart') &&
      params.signal &&
      !ALLOWED_SIGNALS.has(params.signal)
    ) {
      return `Unsupported signal: ${params.signal}`;
    }

    return null;
  }

  protected createInvocation(
    params: ProcessManagerToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ProcessManagerToolParams, ToolResult> {
    return new ProcessManagerToolInvocation(
      this.processManager,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
