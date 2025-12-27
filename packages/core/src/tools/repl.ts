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
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { buildToolActionProfile } from '../safety/approval-ladder/buildToolActionProfile.js';
import { computeMinimumReviewLevel } from '../safety/approval-ladder/computeMinimumReviewLevel.js';

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

    const actionProfile = buildToolActionProfile({
      toolName: REPL_TOOL_NAME,
      args: this.params as unknown as Record<string, unknown>,
      config: this.config,
      provenance: this.getProvenance(),
    });
    const reviewResult = computeMinimumReviewLevel(actionProfile);
    if (reviewResult.level === 'A') {
      return false;
    }

    const confirmationDetails: ToolExecuteConfirmationDetails = {
      type: 'exec',
      title: 'Confirm REPL Execution',
      command: `[${this.params.language}] ${code}`,
      rootCommand: 'repl',
      risk,
      provenance:
        this.getProvenance().length > 0 ? this.getProvenance() : undefined,
      reviewLevel: reviewResult.level,
      requiresPin: reviewResult.requiresPin,
      pinLength: reviewResult.requiresPin ? 6 : undefined,
      explanation: reviewResult.reasons.join('; '),
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
    const replConfig = this.config.getReplToolConfig();
    const timeoutMs = clampTimeout(timeout_ms, replConfig.timeoutMs);
    const sessionName = session_name || `default_${language}`;

    if (replConfig.sandboxTier === 'tier2') {
      if (!replConfig.dockerImage) {
        const message =
          'REPL Docker execution requires tools.repl.dockerImage to be set.';
        return {
          llmContent: `Error: ${message}`,
          returnDisplay: `Error: ${message}`,
          error: {
            message,
            type: ToolErrorType.EXECUTION_FAILED,
          },
        };
      }

      try {
        const result = await executeDockerRepl({
          language,
          code,
          timeoutMs,
          image: replConfig.dockerImage,
          workspaceDir: this.config.getTargetDir(),
        });

        let output = truncateOutput(result.output);
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

    // 1. Get/Create Session
    let session = computerSessionManager.getSession(sessionName);
    if (!session) {
      const sandbox = createTier1Sandbox(language);
      session = computerSessionManager.createSession(
        sessionName,
        language,
        sandbox.cwd,
        sandbox.env,
        sandbox.cleanupPaths,
      );
    }

    // 2. Execute
    try {
      const result = await computerSessionManager.executeCode(
        sessionName,
        code,
        timeoutMs,
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

const NETWORK_BLOCK_MESSAGE =
  'Network access is disabled in this REPL sandbox.';

function clampTimeout(requested: number | undefined, max: number): number {
  if (!requested || requested <= 0) {
    return max;
  }
  return Math.min(requested, max);
}

function appendNodeOption(
  existing: string | undefined,
  addition: string,
): string {
  return existing ? `${existing} ${addition}`.trim() : addition;
}

function createTier1Sandbox(language: ReplToolParams['language']): {
  cwd: string;
  env: Record<string, string>;
  cleanupPaths: string[];
} {
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'terminai-repl-'));
  const env: Record<string, string> = {
    HOME: sandboxRoot,
    TMPDIR: sandboxRoot,
    TMP: sandboxRoot,
    TEMP: sandboxRoot,
    TERMINAI_REPL_NO_NETWORK: '1',
  };

  if (language === 'python') {
    const startupPath = path.join(sandboxRoot, 'disable-network.py');
    fs.writeFileSync(
      startupPath,
      [
        'import socket',
        'import ssl',
        'def _blocked(*_args, **_kwargs):',
        `    raise RuntimeError("${NETWORK_BLOCK_MESSAGE}")`,
        'socket.socket = _blocked',
        'socket.create_connection = _blocked',
        'socket.getaddrinfo = _blocked',
        'ssl.wrap_socket = _blocked',
      ].join('\n'),
    );
    env['PYTHONSTARTUP'] = startupPath;
    env['PYTHONNOUSERSITE'] = '1';
    env['PIP_CACHE_DIR'] = path.join(sandboxRoot, '.pip-cache');
  }

  if (language === 'node') {
    const blockerPath = path.join(sandboxRoot, 'disable-network.js');
    fs.writeFileSync(
      blockerPath,
      [
        `const message = ${JSON.stringify(NETWORK_BLOCK_MESSAGE)};`,
        'const block = () => { throw new Error(message); };',
        'const blockAsync = async () => { throw new Error(message); };',
        "const net = require('net');",
        'net.connect = block;',
        'net.createConnection = block;',
        "const tls = require('tls');",
        'tls.connect = block;',
        "const dgram = require('dgram');",
        'dgram.createSocket = block;',
        "const dns = require('dns');",
        'dns.lookup = block;',
        'dns.resolve = block;',
        'dns.resolve4 = block;',
        'dns.resolve6 = block;',
        "const http = require('http');",
        'http.request = block;',
        'http.get = block;',
        "const https = require('https');",
        'https.request = block;',
        'https.get = block;',
        'if (global.fetch) {',
        '  global.fetch = blockAsync;',
        '}',
      ].join('\n'),
    );
    env['NODE_OPTIONS'] = appendNodeOption(
      process.env['NODE_OPTIONS'],
      `--require ${blockerPath}`,
    );
    env['NODE_REPL_HISTORY'] = path.join(sandboxRoot, '.node_repl_history');
    env['NPM_CONFIG_CACHE'] = path.join(sandboxRoot, '.npm-cache');
    env['NPM_CONFIG_PREFIX'] = path.join(sandboxRoot, '.npm-prefix');
  }

  return {
    cwd: sandboxRoot,
    env,
    cleanupPaths: [sandboxRoot],
  };
}

async function executeDockerRepl(options: {
  language: ReplToolParams['language'];
  code: string;
  timeoutMs: number;
  image: string;
  workspaceDir: string;
}): Promise<{ output: string; timedOut: boolean }> {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'terminai-repl-docker-'),
  );
  const extension =
    options.language === 'python'
      ? 'py'
      : options.language === 'node'
        ? 'js'
        : 'sh';
  const scriptName = `script.${extension}`;
  const scriptPath = path.join(tempDir, scriptName);
  fs.writeFileSync(scriptPath, options.code);

  const containerName = `terminai-repl-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
  const args = [
    'run',
    '--rm',
    '-i',
    '--name',
    containerName,
    '-v',
    `${tempDir}:/work`,
    '-w',
    '/work',
    '-v',
    `${options.workspaceDir}:/workspace`,
    options.image,
  ];

  if (options.language === 'python') {
    args.push('python3', `/work/${scriptName}`);
  } else if (options.language === 'node') {
    args.push('node', `/work/${scriptName}`);
  } else {
    args.push('sh', `/work/${scriptName}`);
  }

  try {
    return await new Promise((resolve, reject) => {
      const child = spawn('docker', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
        cleanupDockerContainer(containerName);
      }, options.timeoutMs);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        if (timedOut) {
          resolve({ output: `${stdout}${stderr}`, timedOut: true });
          return;
        }
        if (code === 0) {
          resolve({ output: stdout, timedOut: false });
          return;
        }
        resolve({
          output: `Exit code ${code}\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`,
          timedOut: false,
        });
      });
    });
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup failures.
    }
  }
}

function cleanupDockerContainer(containerName: string): void {
  try {
    spawnSync('docker', ['rm', '-f', containerName], { stdio: 'ignore' });
  } catch {
    // Ignore cleanup failures.
  }
}
