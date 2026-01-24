/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalRuntimeContext } from './LocalRuntimeContext.js';
import * as fs from 'node:fs';
import * as child_process from 'node:child_process';

vi.mock('node:fs');
vi.mock('node:child_process');

describe('LocalRuntimeContext', () => {
  const cliVersion = '1.0.0';
  const systemPython = '/usr/bin/python3';
  let context: LocalRuntimeContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = new LocalRuntimeContext(systemPython, cliVersion);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct properties', () => {
    expect(context.type).toBe('local');
    expect(context.isIsolated).toBe(false);
    expect(context.pythonPath).toBe(systemPython);
  });

  it('should create venv if it does not exist', async () => {
    // Mock fs checks: envsDir exists, venvPath does NOT exist
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      if (typeof path === 'string' && path.includes('.terminai/envs')) {
        return path.endsWith('envs'); // envs dir exists, but specific venv doesn't
      }
      return false;
    });

    // Mock execSync for venv creation
    const execSyncMock = vi.fn();
    vi.mocked(child_process.execSync).mockImplementation(execSyncMock);

    // Mock resolveAptsPath to return null (skip install for this test)
    // We can't easily mock private methods, so we rely on fs.existsSync returning false for pyproject.toml
    // which happens by default since we mocked fs.existsSync loosely above.

    await context.initialize();

    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('-m venv'),
      expect.anything(),
    );
    // pythonPath should be updated to venv path
    expect(context.pythonPath).toContain('.terminai/envs/default');
  });

  it('should skip venv creation if it exists', async () => {
    // Mock fs checks: venvPath DOES exist
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const execSyncMock = vi.fn();
    vi.mocked(child_process.execSync).mockImplementation(execSyncMock);

    await context.initialize();

    expect(execSyncMock).not.toHaveBeenCalledWith(
      expect.stringContaining('-m venv'),
      expect.anything(),
    );
    expect(context.pythonPath).toContain('.terminai/envs/default');
  });

  it('should install T-APTS if package is found', async () => {
    // Mock fs checks: venv exists, and pyproject.toml exists (simulating T-APTS source found)
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const pStr = String(p);
      if (pStr.includes('pyproject.toml')) return true;
      if (pStr.includes('.terminai/envs/default')) return true;
      return false;
    });

    const execSyncMock = vi.fn();
    vi.mocked(child_process.execSync).mockImplementation(execSyncMock);

    await context.initialize();

    // specific expectations for install commands
    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('pip install --upgrade pip'),
      expect.anything(),
    );
    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('pip install'),
      expect.anything(),
    );
  });

  it('should execute command using shell: true', async () => {
    // Mock spawn for execute
    const spawnMock = vi.fn().mockReturnValue({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn().mockImplementation((event, cb) => {
        if (event === 'close') cb(0);
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(child_process.spawn).mockImplementation(spawnMock as any);

    await context.execute('echo "hello world"');

    // This assertion expects shell: true, which is currently missing
    expect(spawnMock).toHaveBeenCalledWith(
      'echo "hello world"',
      expect.any(Array),
      expect.objectContaining({
        shell: true,
      }),
    );
  });
});
