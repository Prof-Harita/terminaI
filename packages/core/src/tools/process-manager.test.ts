/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mockShellExecutionService = vi.hoisted(() => ({
  execute: vi.fn(),
  writeToPty: vi.fn(),
  isPtyActive: vi.fn(),
}));

vi.mock('../services/shellExecutionService.js', () => ({
  ShellExecutionService: mockShellExecutionService,
}));

import { initializeShellParsers } from '../utils/shell-utils.js';
import {
  ProcessManagerTool,
  getSharedProcessManagerState,
} from './process-manager.js';
import { sessionNotifier } from './process-notifications.js';
import type {
  ShellExecutionResult,
  ShellOutputEvent,
} from '../services/shellExecutionService.js';
import type { Config } from '../config/config.js';
import { WorkspaceContext } from '../utils/workspaceContext.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('ProcessManagerTool', () => {
  beforeAll(async () => {
    await initializeShellParsers();
  });

  let mockConfig: Config;
  let tempRootDir: string;
  let outputCallback: (event: ShellOutputEvent) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    getSharedProcessManagerState().sessions.clear();

    tempRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'process-manager-'));
    fs.mkdirSync(path.join(tempRootDir, 'subdir'));
    outputCallback = () => {};

    mockConfig = {
      getAllowedTools: vi.fn().mockReturnValue([]),
      getApprovalMode: vi.fn().mockReturnValue('strict'),
      getCoreTools: vi.fn().mockReturnValue([]),
      getExcludeTools: vi.fn().mockReturnValue(new Set([])),
      getTargetDir: vi.fn().mockReturnValue(tempRootDir),
      getEnableInteractiveShell: vi.fn().mockReturnValue(true),
      getShellExecutionConfig: vi.fn().mockReturnValue({}),
      getWorkspaceContext: vi
        .fn()
        .mockReturnValue(new WorkspaceContext(tempRootDir)),
    } as unknown as Config;

    mockShellExecutionService.execute.mockImplementation(
      (_command, _cwd, callback) => {
        outputCallback = callback;
        return {
          pid: 123,
          result: new Promise<ShellExecutionResult>(() => {}),
        };
      },
    );

    mockShellExecutionService.isPtyActive.mockReturnValue(true);
  });

  afterEach(() => {
    if (fs.existsSync(tempRootDir)) {
      fs.rmSync(tempRootDir, { recursive: true, force: true });
    }
  });

  it('requires background=true to start a session', () => {
    const tool = new ProcessManagerTool(mockConfig);
    expect(() =>
      tool.build({
        operation: 'start',
        name: 'dev',
        command: 'node -e "console.log(1)"',
      }),
    ).toThrow('background');
  });

  it('starts a session and lists it', async () => {
    const tool = new ProcessManagerTool(mockConfig);
    const startInvocation = tool.build({
      operation: 'start',
      name: 'dev',
      command: 'node -e "console.log(1)"',
      background: true,
    });

    const startResult = await startInvocation.execute(
      new AbortController().signal,
    );
    const startData = JSON.parse(startResult.llmContent as string);
    expect(startData.session.name).toBe('dev');

    outputCallback({ type: 'data', chunk: 'ready\n' });

    const readResult = await tool
      .build({ operation: 'read', name: 'dev', lines: 5 })
      .execute(new AbortController().signal);
    expect(readResult.llmContent).toContain('ready');

    const listResult = await tool
      .build({ operation: 'list' })
      .execute(new AbortController().signal);
    const listData = JSON.parse(listResult.llmContent as string);
    expect(listData.sessions).toHaveLength(1);
    expect(listData.sessions[0].name).toBe('dev');
  });

  it('sends input to an active PTY session', async () => {
    const tool = new ProcessManagerTool(mockConfig);
    await tool
      .build({
        operation: 'start',
        name: 'dev',
        command: 'node -e "console.log(1)"',
        background: true,
      })
      .execute(new AbortController().signal);

    const result = await tool
      .build({ operation: 'send', name: 'dev', text: 'hello\n' })
      .execute(new AbortController().signal);

    expect(result.llmContent).toContain('Sent input');
    expect(mockShellExecutionService.writeToPty).toHaveBeenCalledWith(
      123,
      'hello\n',
    );
  });

  it('summarizes recent output', async () => {
    const tool = new ProcessManagerTool(mockConfig);
    await tool
      .build({
        operation: 'start',
        name: 'dev',
        command: 'node -e "console.log(1)"',
        background: true,
      })
      .execute(new AbortController().signal);

    outputCallback({ type: 'data', chunk: 'first line\nsecond line\n' });

    const session =
      getSharedProcessManagerState().sessions.get('dev') ??
      ({} as { outputLines?: string[] });
    expect(session.outputLines?.length ?? 0).toBeGreaterThan(0);

    const summarizeResult = await tool
      .build({ operation: 'summarize', name: 'dev', lines: 1 })
      .execute(new AbortController().signal);

    expect(summarizeResult.llmContent).toContain(
      'Session "dev" — last 1 lines:',
    );
    expect(summarizeResult.returnDisplay).toContain('second line');
  });

  it('requires confirmation for stop', async () => {
    const tool = new ProcessManagerTool(mockConfig);
    const invocation = tool.build({ operation: 'stop', name: 'dev' });
    const confirmation = await invocation.shouldConfirmExecute(
      new AbortController().signal,
    );

    if (confirmation === false) {
      throw new Error('Confirmation should not be false');
    }
    expect(confirmation.type).toBe('exec');
  });

  it('emits notifications on start', async () => {
    const handler = vi.fn();
    sessionNotifier.on('session-event', handler);
    const tool = new ProcessManagerTool(mockConfig);
    await tool
      .build({
        operation: 'start',
        name: 'dev',
        command: 'node -e "console.log(1)"',
        background: true,
      })
      .execute(new AbortController().signal);
    sessionNotifier.removeListener('session-event', handler);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'started', sessionName: 'dev' }),
    );
  });
});
