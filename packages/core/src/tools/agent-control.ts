/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { Config } from '../config/config.js';
import {
  escapeShellArg,
  getShellConfiguration,
  getCommandRoots,
  initializeShellParsers,
} from '../utils/shell-utils.js';
import { isCommandAllowed } from '../utils/shell-permissions.js';
import type {
  ToolCallConfirmationDetails,
  ToolExecuteConfirmationDetails,
  ToolInvocation,
  ToolResult,
  ToolConfirmationOutcome,
} from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolErrorType } from './tool-error.js';
import { AGENT_CONTROL_TOOL_NAME } from './tool-names.js';
import {
  ProcessManager,
  type ProcessManagerSignal,
  getSharedProcessManagerState,
} from './process-manager.js';

const DEFAULT_ALLOWED_AGENTS = new Set(['claude', 'aider']);

export type AgentControlOperation =
  | 'start'
  | 'send'
  | 'read'
  | 'stop'
  | 'list'
  | 'status';

export interface AgentControlToolParams {
  operation: AgentControlOperation;
  name?: string;
  agent?: string;
  args?: string[];
  command?: string;
  cwd?: string;
  env?: Record<string, string>;
  background?: boolean;
  lines?: number;
  text?: string;
  signal?: ProcessManagerSignal;
}

const normalizeAgentName = (value?: string): string => (value ?? '').trim();

const buildAgentCommand = (agent: string, args: string[]): string => {
  const { shell } = getShellConfiguration();
  const escapedArgs = args
    .map((arg) => escapeShellArg(arg, shell))
    .filter(Boolean);
  if (escapedArgs.length === 0) {
    return agent;
  }
  return `${agent} ${escapedArgs.join(' ')}`;
};

class AgentControlToolInvocation extends BaseToolInvocation<
  AgentControlToolParams,
  ToolResult
> {
  constructor(
    private readonly processManager: ProcessManager,
    params: AgentControlToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    switch (this.params.operation) {
      case 'start':
        return `Start agent "${this.params.agent}" as session "${this.params.name}"`;
      case 'send':
        return `Send input to agent session "${this.params.name}"`;
      case 'read':
        return `Read output from agent session "${this.params.name}"`;
      case 'stop':
        return `Stop agent session "${this.params.name}"`;
      case 'list':
        return 'List agent sessions';
      case 'status':
        return `Get status for agent session "${this.params.name}"`;
      default:
        return 'Manage agent sessions';
    }
  }

  protected override async getConfirmationDetails(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    const needsConfirmation =
      this.params.operation === 'start' || this.params.operation === 'stop';
    if (!needsConfirmation) {
      return false;
    }

    const command = (() => {
      if (this.params.operation === 'start') {
        return `start ${this.params.agent} as ${this.params.name}`;
      }
      return `stop ${this.params.name}`;
    })();

    const confirmationDetails: ToolExecuteConfirmationDetails = {
      type: 'exec',
      title: 'Confirm Agent Action',
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
      case 'start': {
        const agentName = normalizeAgentName(this.params.agent);
        const args = this.params.args ?? [];
        const command =
          this.params.command ??
          (agentName ? buildAgentCommand(agentName, args) : '');
        return this.processManager.startSession({
          name: (this.params.name ?? '').trim(),
          command,
          cwd: this.params.cwd,
          env: this.params.env,
        });
      }
      case 'send':
        return this.processManager.sendInput(
          (this.params.name ?? '').trim(),
          this.params.text ?? '',
        );
      case 'read':
        return this.processManager.readOutput(
          (this.params.name ?? '').trim(),
          this.params.lines,
        );
      case 'stop':
        return this.processManager.stopSession(
          (this.params.name ?? '').trim(),
          this.params.signal ?? 'SIGTERM',
        );
      case 'list':
        return this.processManager.listSessions();
      case 'status':
        return this.processManager.getStatus((this.params.name ?? '').trim());
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

export class AgentControlTool extends BaseDeclarativeTool<
  AgentControlToolParams,
  ToolResult
> {
  static readonly Name = AGENT_CONTROL_TOOL_NAME;

  private readonly processManager: ProcessManager;

  constructor(
    private readonly config: Config,
    messageBus?: MessageBus,
    processManager = new ProcessManager(config, getSharedProcessManagerState()),
  ) {
    void initializeShellParsers().catch(() => {
      // Errors are surfaced when parsing commands.
    });
    super(
      AgentControlTool.Name,
      'AgentControl',
      'Manage external agent CLIs as supervised sessions (start/send/read/stop).',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['start', 'send', 'read', 'stop', 'list', 'status'],
            description: 'The agent control operation to perform.',
          },
          name: {
            type: 'string',
            description: 'Name of the agent session to operate on.',
          },
          agent: {
            type: 'string',
            description: 'Agent binary to run (allowlisted).',
          },
          args: {
            type: 'array',
            description: 'Arguments to pass to the agent binary.',
            items: { type: 'string' },
          },
          cwd: {
            type: 'string',
            description: 'Optional working directory for the agent session.',
          },
          env: {
            type: 'object',
            description: 'Optional environment variables for the agent.',
            additionalProperties: { type: 'string' },
          },
          background: {
            type: 'boolean',
            description: 'Must be true to start a background agent session.',
          },
          lines: {
            type: 'integer',
            description: 'Optional number of lines to read from output.',
          },
          text: {
            type: 'string',
            description: 'Text to send to the agent stdin.',
          },
          signal: {
            type: 'string',
            enum: ['SIGINT', 'SIGTERM', 'SIGKILL'],
            description: 'Signal to send when stopping an agent.',
          },
        },
        required: ['operation'],
      },
      false,
      false,
      messageBus,
    );

    this.processManager = processManager;
  }

  protected override validateToolParamValues(
    params: AgentControlToolParams,
  ): string | null {
    const operation = params.operation;
    const needsName = operation !== 'list';
    if (needsName && (!params.name || !params.name.trim())) {
      return "The 'name' parameter must be provided for this operation.";
    }

    if (operation === 'start') {
      const agent = normalizeAgentName(params.agent);
      if (!agent) {
        return "The 'agent' parameter must be provided for start.";
      }
      if (!DEFAULT_ALLOWED_AGENTS.has(agent)) {
        return `Agent '${agent}' is not in the allowlist. Allowed: ${[
          ...DEFAULT_ALLOWED_AGENTS,
        ].join(', ')}`;
      }
      if (params.background !== true) {
        return "The 'background' parameter must be set to true to start an agent.";
      }
      if (params.args && !Array.isArray(params.args)) {
        return "The 'args' parameter must be an array of strings.";
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

      const args = params.args ?? [];
      if (!args.every((arg) => typeof arg === 'string')) {
        return "The 'args' parameter must contain only strings.";
      }

      const command = buildAgentCommand(agent, args);
      const commandCheck = isCommandAllowed(command, this.config);
      if (!commandCheck.allowed) {
        return commandCheck.reason ?? `Command is not allowed: ${command}`;
      }
      if (getCommandRoots(command).length === 0) {
        return 'Could not identify command root to obtain permission from user.';
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

      params.command = command;
    }

    if (operation === 'read' && params.lines !== undefined) {
      if (!Number.isFinite(params.lines) || params.lines <= 0) {
        return "The 'lines' parameter must be a positive integer.";
      }
    }

    if (operation === 'send') {
      if (!params.text) {
        return "The 'text' parameter must be provided for send.";
      }
    }

    return null;
  }

  protected createInvocation(
    params: AgentControlToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<AgentControlToolParams, ToolResult> {
    return new AgentControlToolInvocation(
      this.processManager,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
