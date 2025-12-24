/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComputerSessionManager } from './ComputerSessionManager.js';

// Mock PersistentShell
const { mockWrite, mockKill, mockDispose, MockPersistentShell } = vi.hoisted(
  () => {
    const mWrite = vi.fn();
    const mResize = vi.fn();
    const mKill = vi.fn();
    const mDispose = vi.fn();

    const MockClass = vi.fn().mockImplementation(({ onOutput, onExit }) => ({
      write: mWrite,
      resize: mResize,
      kill: mKill,
      dispose: mDispose,
      pid: 123,
      __triggerOutput: (data: string) => onOutput(data),
      __triggerExit: (code: number, signal: number) => onExit(code, signal),
    }));
    return {
      mockWrite: mWrite,
      mockKill: mKill,
      mockDispose: mDispose,
      MockPersistentShell: MockClass,
    };
  },
);

vi.mock('./PersistentShell.js', () => ({
  PersistentShell: MockPersistentShell,
}));

describe('ComputerSessionManager', () => {
  let manager: ComputerSessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ComputerSessionManager();
  });

  it('creates and retrieves session', () => {
    const session = manager.createSession('test', 'shell', '/tmp');
    expect(manager.hasSession('test')).toBe(true);
    expect(manager.getSession('test')).toBe(session);
    expect(MockPersistentShell).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'shell',
        cwd: '/tmp',
      }),
    );
  });

  it('executes code causing output and resolve', async () => {
    manager.createSession('test', 'shell', '/tmp');
    const executePromise = manager.executeCode('test', 'echo hello');

    // Simulate output trigger logic
    // In real implementation, executeCode calls write, then waits.
    // We need to trigger output on the mock shell.

    expect(mockWrite).toHaveBeenCalledWith('echo hello');

    // Access the mock instance created
    const mockInstance = MockPersistentShell.mock.results[0]?.value as {
      __triggerOutput: (data: string) => void;
    };
    mockInstance.__triggerOutput('hello\n');

    const result = await executePromise;
    expect(result.output).toBe('hello\n');
    expect(result.timedOut).toBe(false);
  });

  it('handles timeout', async () => {
    vi.useFakeTimers();
    manager.createSession('test', 'shell', '/tmp');
    const executePromise = manager.executeCode('test', 'sleep 10', 1000);

    expect(mockWrite).toHaveBeenCalledWith('sleep 10');

    // Trigger initial timeout (calls handleTimeout -> kills -> starts 2s timer)
    await vi.advanceTimersByTimeAsync(1100);

    // Now handleTimeout is waiting 2s. We need to advance that too.
    await vi.advanceTimersByTimeAsync(2000);

    const result = await executePromise;
    expect(result.timedOut).toBe(true);
    expect(mockKill).toHaveBeenCalledWith('SIGINT');

    vi.useRealTimers();
  });

  it('killSession terminates and removes', () => {
    manager.createSession('test', 'shell', '/tmp');
    manager.killSession('test');
    expect(mockKill).toHaveBeenCalled();
    expect(manager.hasSession('test')).toBe(false);
  });

  it('listSessions returns all active', () => {
    manager.createSession('s1', 'shell', '/tmp');
    manager.createSession('s2', 'python', '/tmp');
    const list = manager.listSessions();
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.name)).toContain('s1');
    expect(list.map((s) => s.name)).toContain('s2');
  });

  it('disposeAll cleans up everything', () => {
    manager.createSession('s1', 'shell', '/tmp');
    manager.disposeAll();
    expect(mockDispose).toHaveBeenCalled();
    expect(manager.listSessions()).toHaveLength(0);
  });
});
