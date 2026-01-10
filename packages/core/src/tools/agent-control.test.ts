/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  beforeEach,
  afterEach,
  beforeAll,
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

import type { Config } from '../config/config.js';
import { WorkspaceContext } from '../utils/workspaceContext.js';
import { AgentControlTool } from './agent-control.js';
import { getSharedProcessManagerState } from './process-manager.js';
import type { ShellExecutionResult } from '../services/shellExecutionService.js';
import { initializeShellParsers } from '../utils/shell-utils.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Skip on Windows - initializeShellParsers() hangs
describe.skipIf(process.platform === 'win32')('AgentControlTool', () => {
  let mockConfig: Config;
  let tempRootDir: string;

  beforeAll(async () => {
    await initializeShellParsers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getSharedProcessManagerState().sessions.clear();

    tempRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-'));

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

    mockShellExecutionService.execute.mockImplementation((command) => ({
      pid: 456,
      result: new Promise<ShellExecutionResult>(() => {}),
      command,
    }));

    mockShellExecutionService.isPtyActive.mockReturnValue(true);
  });

  afterEach(() => {
    if (fs.existsSync(tempRootDir)) {
      fs.rmSync(tempRootDir, { recursive: true, force: true });
    }
  });

  it('starts an agent session and passes args to the command', async () => {
    const tool = new AgentControlTool(mockConfig);
    const invocation = tool.build({
      operation: 'start',
      name: 'agent',
      agent: 'claude',
      args: ['--help'],
      background: true,
    });

    const result = await invocation.execute(new AbortController().signal);
    expect(result.returnDisplay).toContain('Started session');
    expect(mockShellExecutionService.execute).toHaveBeenCalled();
    const command = mockShellExecutionService.execute.mock.calls[0][0];
    expect(command).toContain('claude');
    expect(command).toContain('--help');
  });

  it('sends input to an active agent session', async () => {
    const tool = new AgentControlTool(mockConfig);
    await tool
      .build({
        operation: 'start',
        name: 'agent',
        agent: 'claude',
        background: true,
      })
      .execute(new AbortController().signal);

    const result = await tool
      .build({ operation: 'send', name: 'agent', text: 'hello\n' })
      .execute(new AbortController().signal);

    expect(result.llmContent).toContain('Sent input');
    expect(mockShellExecutionService.writeToPty).toHaveBeenCalledWith(
      456,
      'hello\n',
    );
  });

  it('requires confirmation for stop', async () => {
    const tool = new AgentControlTool(mockConfig);
    const invocation = tool.build({ operation: 'stop', name: 'agent' });
    const confirmation = await invocation.shouldConfirmExecute(
      new AbortController().signal,
    );

    if (confirmation === false) {
      throw new Error('Confirmation should not be false');
    }
    expect(confirmation.type).toBe('exec');
  });
});
