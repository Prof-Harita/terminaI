/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReplTool, type ReplToolParams } from './repl.js';
import type { Config } from '../config/config.js';
import { ToolErrorType } from './tool-error.js';
import { REPL_TOOL_NAME } from './tool-names.js';
import * as sessionManagerModule from '../computer/ComputerSessionManager.js';
import * as os from 'node:os';
import * as path from 'node:path';

// Mock the ComputerSessionManager
vi.mock('../computer/ComputerSessionManager.js', () => {
  const mockSession = {
    name: 'test-session',
    language: 'python',
    shell: {},
    outputBuffer: [],
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
  };

  return {
    computerSessionManager: {
      getSession: vi.fn(),
      createSession: vi.fn(() => mockSession),
      executeCode: vi.fn(),
      killSession: vi.fn(),
      listSessions: vi.fn(() => []),
      disposeAll: vi.fn(),
    },
  };
});

// Mock the risk classifier
vi.mock('../safety/risk-classifier.js', () => ({
  classifyRisk: vi.fn(() => 'low'),
}));

describe('ReplTool', () => {
  let mockConfig: Config;
  let replTool: ReplTool;
  const mockAbortSignal = new AbortController().signal;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      getTargetDir: vi.fn(() => '/tmp/test'),
      getReplToolConfig: vi.fn(() => ({
        sandboxTier: 'tier1',
        timeoutMs: 30000,
      })),
      getTrustedDomains: vi.fn(() => []),
      getCriticalPaths: vi.fn(() => []),
      getSecurityProfile: vi.fn(() => 'strict'),
      getApprovalPin: vi.fn(() => '000000'),
      getBrainAuthority: vi.fn(() => ({})),
      getAuditLedger: vi.fn(() => ({})),
      getAuditSettings: vi.fn(() => ({})),
    } as unknown as Config;
    replTool = new ReplTool(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool properties', () => {
    it('should have correct name, displayName, and description', () => {
      expect(replTool.name).toBe(REPL_TOOL_NAME);
      expect(replTool.displayName).toBe('Execute REPL');
      expect(replTool.description).toContain('persistent REPL session');
    });

    it('should have correct schema with required fields', () => {
      expect(replTool.schema).toBeDefined();
      expect(replTool.schema.name).toBe(REPL_TOOL_NAME);
      expect(replTool.schema.parametersJsonSchema).toMatchObject({
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['python', 'shell', 'node'] },
          code: { type: 'string' },
          session_name: { type: 'string' },
          timeout_ms: { type: 'number' },
        },
        required: ['language', 'code'],
      });
    });
  });

  describe('execute', () => {
    it('should execute python code and return output', async () => {
      vi.mocked(
        sessionManagerModule.computerSessionManager.executeCode,
      ).mockResolvedValue({
        output: 'Hello, World!\n',
        timedOut: false,
      });

      const params: ReplToolParams = {
        language: 'python',
        code: 'print("Hello, World!")',
      };
      const invocation = replTool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      expect(result.llmContent).toContain('Hello, World!');
      expect(result.error).toBeUndefined();
      expect(
        sessionManagerModule.computerSessionManager.executeCode,
      ).toHaveBeenCalledWith('default_python', 'print("Hello, World!")', 30000);
    });

    it('should create session if not exists', async () => {
      vi.mocked(
        sessionManagerModule.computerSessionManager.getSession,
      ).mockReturnValue(undefined);
      vi.mocked(
        sessionManagerModule.computerSessionManager.executeCode,
      ).mockResolvedValue({
        output: '5\n',
        timedOut: false,
      });

      const params: ReplToolParams = {
        language: 'python',
        code: 'x = 5; print(x)',
        session_name: 'my-session',
      };
      const invocation = replTool.build(params);
      await invocation.execute(mockAbortSignal);

      const [sessionName, sessionLanguage, cwd, env, cleanupPaths] = vi.mocked(
        sessionManagerModule.computerSessionManager.createSession,
      ).mock.calls[0];
      const expectedPrefix = path.join(os.tmpdir(), 'terminai-repl-');

      expect(sessionName).toBe('my-session');
      expect(sessionLanguage).toBe('python');
      expect(cwd).toContain(expectedPrefix);
      expect(env?.['HOME']).toBe(cwd);
      expect(cleanupPaths).toEqual([cwd]);
    });

    it('should use existing session if available', async () => {
      const existingSession = {
        name: 'existing',
        language: 'python' as const,
        shell: {},
        outputBuffer: [],
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      } as unknown as sessionManagerModule.ReplSession;
      vi.mocked(
        sessionManagerModule.computerSessionManager.getSession,
      ).mockReturnValue(existingSession);
      vi.mocked(
        sessionManagerModule.computerSessionManager.executeCode,
      ).mockResolvedValue({
        output: 'reused\n',
        timedOut: false,
      });

      const params: ReplToolParams = {
        language: 'python',
        code: 'print("reused")',
        session_name: 'existing',
      };
      const invocation = replTool.build(params);
      await invocation.execute(mockAbortSignal);

      expect(
        sessionManagerModule.computerSessionManager.createSession,
      ).not.toHaveBeenCalled();
    });

    it('should handle timeout correctly', async () => {
      vi.mocked(
        sessionManagerModule.computerSessionManager.executeCode,
      ).mockResolvedValue({
        output: 'Partial output...',
        timedOut: true,
      });

      const params: ReplToolParams = {
        language: 'python',
        code: 'while True: pass',
        timeout_ms: 1000,
      };
      const invocation = replTool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      expect(result.llmContent).toContain('⚠️ Execution timed out');
      expect(
        sessionManagerModule.computerSessionManager.executeCode,
      ).toHaveBeenCalledWith('default_python', 'while True: pass', 1000);
    });

    it('should detect Python errors and add guidance', async () => {
      vi.mocked(
        sessionManagerModule.computerSessionManager.executeCode,
      ).mockResolvedValue({
        output:
          'Traceback (most recent call last):\n  File "<stdin>", line 1\nNameError: name "undefined_var" is not defined',
        timedOut: false,
      });

      const params: ReplToolParams = {
        language: 'python',
        code: 'print(undefined_var)',
      };
      const invocation = replTool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      expect(result.llmContent).toContain('⚠️ Error detected');
      expect(result.llmContent).toContain('Review the traceback');
    });

    it('should detect Node.js errors and add guidance', async () => {
      vi.mocked(
        sessionManagerModule.computerSessionManager.executeCode,
      ).mockResolvedValue({
        output: 'ReferenceError: undefined_var is not defined',
        timedOut: false,
      });

      const params: ReplToolParams = {
        language: 'node',
        code: 'console.log(undefined_var)',
      };
      const invocation = replTool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      expect(result.llmContent).toContain('⚠️ Error detected');
    });

    it('should handle execution errors gracefully', async () => {
      vi.mocked(
        sessionManagerModule.computerSessionManager.executeCode,
      ).mockRejectedValue(new Error('Session crashed'));

      const params: ReplToolParams = {
        language: 'python',
        code: 'print("test")',
      };
      const invocation = replTool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      expect(result.llmContent).toContain('Error: Session crashed');
      expect(result.error?.type).toBe(ToolErrorType.EXECUTION_FAILED);
    });

    it('should return early if aborted', async () => {
      const abortController = new AbortController();
      abortController.abort();

      const params: ReplToolParams = {
        language: 'python',
        code: 'print("test")',
      };
      const invocation = replTool.build(params);
      const result = await invocation.execute(abortController.signal);

      expect(result.llmContent).toBe('Cancelled');
      expect(
        sessionManagerModule.computerSessionManager.executeCode,
      ).not.toHaveBeenCalled();
    });
  });

  describe('shouldConfirmExecute', () => {
    it('should return confirmation details with risk assessment', async () => {
      const params: ReplToolParams = {
        language: 'python',
        code: 'print("Hello")',
      };
      const invocation = replTool.build(params);
      const confirmationDetails =
        await invocation.shouldConfirmExecute(mockAbortSignal);

      expect(confirmationDetails).toBeDefined();
      expect(confirmationDetails).not.toBe(false);

      if (confirmationDetails && typeof confirmationDetails === 'object') {
        expect(confirmationDetails.type).toBe('exec');
        expect(confirmationDetails.title).toBe('Confirm REPL Execution');
        if ('command' in confirmationDetails) {
          expect(confirmationDetails.command).toContain('[python]');
          expect(confirmationDetails.command).toContain('print("Hello")');
        }
      }
    });
  });

  describe('getDescription', () => {
    it('should return a truncated description for long code', () => {
      const longCode = 'x'.repeat(100);
      const params: ReplToolParams = {
        language: 'python',
        code: longCode,
      };
      const invocation = replTool.build(params);
      const description = invocation.getDescription();

      expect(description).toContain('Execute python code');
      expect(description).toContain('...');
      expect(description.length).toBeLessThan(150);
    });

    it('should include session name in description', () => {
      const params: ReplToolParams = {
        language: 'node',
        code: 'console.log(1)',
        session_name: 'my-session',
      };
      const invocation = replTool.build(params);
      const description = invocation.getDescription();

      expect(description).toContain('my-session');
    });
  });

  describe('state persistence simulation', () => {
    it('should simulate state persisting across multiple tool calls', async () => {
      // First call: define a variable
      vi.mocked(
        sessionManagerModule.computerSessionManager.executeCode,
      ).mockResolvedValueOnce({
        output: '',
        timedOut: false,
      });

      const params1: ReplToolParams = {
        language: 'python',
        code: 'x = 42',
        session_name: 'persist-test',
      };
      const invocation1 = replTool.build(params1);
      await invocation1.execute(mockAbortSignal);

      // Second call: use the variable
      vi.mocked(
        sessionManagerModule.computerSessionManager.executeCode,
      ).mockResolvedValueOnce({
        output: '42\n',
        timedOut: false,
      });

      const params2: ReplToolParams = {
        language: 'python',
        code: 'print(x)',
        session_name: 'persist-test',
      };
      const invocation2 = replTool.build(params2);
      const result2 = await invocation2.execute(mockAbortSignal);

      // Verify both used the same session
      expect(
        sessionManagerModule.computerSessionManager.executeCode,
      ).toHaveBeenCalledTimes(4); // 2 main + 2 state summary calls
      expect(result2.llmContent).toContain('42');
    });
  });
});
