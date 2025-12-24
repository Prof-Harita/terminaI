/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolInvocation,
  type ToolResult,
  type ToolCallConfirmationDetails,
  type ToolExecuteConfirmationDetails,
} from './tools.js';
import { type Config } from '../config/config.js';
import { type MessageBus } from '../confirmation-bus/message-bus.js';
import { computerSessionManager } from '../computer/ComputerSessionManager.js';
import { truncateOutput } from '../computer/truncateOutput.js';
import { classifyRisk } from '../safety/risk-classifier.js';
import { REPL_TOOL_NAME } from './tool-names.js';
import { getErrorMessage } from '../utils/errors.js';
import { ToolErrorType } from './tool-error.js';

export interface ReplToolParams {
  language: 'python' | 'shell' | 'node';
  code: string;
  session_name?: string;
  timeout_ms?: number;
}

class ReplToolInvocation extends BaseToolInvocation<
  ReplToolParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: ReplToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Execute ${this.params.language} code in session "${this.params.session_name || 'default'}": ${this.params.code.slice(0, 50)}${this.params.code.length > 50 ? '...' : ''}`;
  }

  protected override async getConfirmationDetails(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    // Risk Assessment Logic
    const code = this.params.code;
    const risk = classifyRisk(code); // Basic heuristic

    const confirmationDetails: ToolExecuteConfirmationDetails = {
      type: 'exec',
      title: 'Confirm REPL Execution',
      command: `[${this.params.language}] ${code}`,
      rootCommand: 'repl',
      risk,
      onConfirm: async (outcome) => {
        await this.publishPolicyUpdate(outcome);
      },
    };
    return confirmationDetails;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    if (signal.aborted) {
      return { llmContent: 'Cancelled', returnDisplay: 'Cancelled' };
    }

    const { language, code, session_name, timeout_ms } = this.params;
    const sessionName = session_name || `default_${language}`;

    // 1. Get/Create Session
    let session = computerSessionManager.getSession(sessionName);
    if (!session) {
      session = computerSessionManager.createSession(
        sessionName,
        language,
        this.config.getTargetDir(),
      );
    }

    // 2. Execute
    try {
      const result = await computerSessionManager.executeCode(
        sessionName,
        code,
        timeout_ms,
      );

      let output = result.output;

      // Phase 5: Output Truncation
      output = truncateOutput(output);

      // Phase 3.5: State Summary Injection
      if (!result.timedOut) {
        output += await this.getFooterSummary(language, sessionName);
      }

      // Phase 3.6: Error Recovery Guidance
      if (this.detectError(language, output)) {
        output +=
          '\n\n⚠️ Error detected. Review the traceback above and try a fix.';
      }

      if (result.timedOut) {
        output += '\n\n⚠️ Execution timed out and was terminated.';
      }

      return {
        llmContent: output,
        returnDisplay: output,
      };
    } catch (error) {
      return {
        llmContent: `Error: ${getErrorMessage(error)}`,
        returnDisplay: `Error: ${getErrorMessage(error)}`,
        error: {
          message: getErrorMessage(error),
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }

  private detectError(language: string, output: string): boolean {
    if (language === 'python')
      return output.includes('Traceback (most recent call last)');
    if (language === 'node')
      return output.includes('Error:') || output.includes('ReferenceError:'); // Simple heuristic
    if (language === 'shell') return false; // Harder to detect unless we check exit codes, but REPL might not show them easily
    return false;
  }

  private async getFooterSummary(
    language: string,
    sessionName: string,
  ): Promise<string> {
    // Silently run inspection
    // We can use executeCode but need to ensure we don't recurse or mess up buffer.
    // ComputerSessionManager executeCode cleans buffer for *that* run.
    // But wait, if we run it immediately after, it's fine.

    let inspectCode = '';
    if (language === 'python')
      inspectCode =
        'print(f\'Session state: {[v for v in dir() if not v.startswith("_")]}\')';
    else if (language === 'node')
      inspectCode =
        "console.log('Session state:', Object.keys(global).filter(k => !k.startsWith('_')))";
    else if (language === 'shell')
      inspectCode = "echo 'Session state:'; compgen -v | head -10";

    try {
      const res = await computerSessionManager.executeCode(
        sessionName,
        inspectCode,
        5000,
      );
      return `\n\n--- ${res.output.trim()} ---`;
    } catch (_) {
      return ''; // Ignore failure in summary
    }
  }
}

export class ReplTool extends BaseDeclarativeTool<ReplToolParams, ToolResult> {
  static readonly Name = REPL_TOOL_NAME;

  constructor(
    private readonly config: Config,
    messageBus?: MessageBus,
  ) {
    super(
      ReplTool.Name,
      'Execute REPL',
      'Execute code in a persistent REPL session. Variables persist. Use for Python, Node, or Shell.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          language: {
            type: 'string',
            enum: ['python', 'shell', 'node'],
            description: 'The language to execute.',
          },
          code: {
            type: 'string',
            description: 'The code to execute.',
          },
          session_name: {
            type: 'string',
            description: 'Optional session name to persist state.',
          },
          timeout_ms: {
            type: 'number',
            description: 'Optional timeout in ms.',
          },
        },
        required: ['language', 'code'],
      },
      false,
      false,
      messageBus,
    );
  }

  protected createInvocation(
    params: ReplToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ReplToolParams, ToolResult> {
    return new ReplToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
