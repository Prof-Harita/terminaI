/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersistentShell } from './PersistentShell.js';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as cp from 'node:child_process';

// Mock node-pty
const { mockSpawn, mockPtyProcess } = vi.hoisted(() => {
  const mockPty = {
    pid: 12345,
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
  };
  return {
    mockPtyProcess: mockPty,
    mockSpawn: vi.fn().mockReturnValue(mockPty),
  };
});

vi.mock('node-pty', () => ({
  spawn: mockSpawn,
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return {
    ...actual,
    mkdtempSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof cp>();
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

describe('PersistentShell', () => {
  let onOutput: (data: string) => void;
  let onExit: (code: number | null, signal: number | null) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    onOutput = vi.fn();
    onExit = vi.fn();

    // Default mock implementation for events
    mockPtyProcess.onData.mockReturnValue({ dispose: vi.fn() });
    mockPtyProcess.onExit.mockReturnValue({ dispose: vi.fn() });
  });

  it('spawns a shell process', () => {
    new PersistentShell({
      language: 'shell',
      cwd: '/tmp',
      onOutput,
      onExit,
    });

    expect(mockSpawn).toHaveBeenCalled();
    const args = mockSpawn.mock.calls[0];
    expect(args[2].cwd).toBe('/tmp');
  });

  it('spawns python with venv creation', () => {
    vi.mocked(fs.mkdtempSync).mockReturnValue('/tmp/venv-123');

    new PersistentShell({
      language: 'python',
      cwd: '/tmp',
      onOutput,
      onExit,
    });

    expect(fs.mkdtempSync).toHaveBeenCalled();
    expect(cp.execSync).toHaveBeenCalledWith(
      expect.stringContaining('python3 -m venv'),
      expect.anything(),
    );

    expect(mockSpawn).toHaveBeenCalled();
    const cmd = mockSpawn.mock.calls[0][0];
    // Should assume unix-like path in test env if not windows, but let's check basic validity
    if (os.platform() === 'win32') {
      expect(cmd).toContain('python.exe');
    } else {
      expect(cmd).toContain('python3');
    }
  });

  it('writes to the pty process', () => {
    const shell = new PersistentShell({
      language: 'shell',
      cwd: '/tmp',
      onOutput,
      onExit,
    });

    shell.write('ls -la');
    expect(mockPtyProcess.write).toHaveBeenCalledWith('ls -la\n');
  });

  it('writes to python process (ensures newline)', () => {
    const shell = new PersistentShell({
      language: 'python',
      cwd: '/tmp',
      onOutput,
      onExit,
    });

    shell.write('print("hello")');
    // Python logic in PersistentShell ensures newline
    expect(mockPtyProcess.write).toHaveBeenCalledWith('print("hello")\n');
  });

  it('resizes the pty', () => {
    const shell = new PersistentShell({
      language: 'shell',
      cwd: '/tmp',
      onOutput,
      onExit,
    });

    shell.resize(100, 40);
    expect(mockPtyProcess.resize).toHaveBeenCalledWith(100, 40);
  });

  it('kills the process', () => {
    const shell = new PersistentShell({
      language: 'shell',
      cwd: '/tmp',
      onOutput,
      onExit,
    });

    shell.kill('SIGKILL');
    expect(mockPtyProcess.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('disposes functionality cleans up', () => {
    vi.mocked(fs.mkdtempSync).mockReturnValue('/tmp/venv-cleanup');
    const shell = new PersistentShell({
      language: 'python',
      cwd: '/tmp',
      onOutput,
      onExit,
    });

    shell.dispose();

    expect(mockPtyProcess.kill).toHaveBeenCalled(); // No arg usually means SIGTERM/SIGHUP equivalent in dispose
    expect(fs.rmSync).toHaveBeenCalledWith(
      '/tmp/venv-cleanup',
      expect.objectContaining({ recursive: true }),
    );
  });
});
