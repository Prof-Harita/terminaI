/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChildProcess, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { SandboxController } from '../sandbox.js';

describe('SandboxController', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to docker-backed sandboxes', async () => {
    const controller = new SandboxController();
    const startSpy = vi
      .spyOn(
        controller as unknown as {
          startDockerContainer: (id: string, workDir: string) => Promise<string>;
        },
        'startDockerContainer',
      )
      .mockResolvedValue('container-id');

    const sandbox = await controller.create();
    expect(sandbox.type).toBe('docker');
    expect(startSpy).toHaveBeenCalledOnce();
    await controller.destroy(sandbox);
  });

  it('requires opt-in for host execution', async () => {
    const controller = new SandboxController({ type: 'host' });
    await expect(controller.create()).rejects.toThrow(/allow-unsafe-host/);
  });

  it('allows host execution when opt-in is set', async () => {
    const controller = new SandboxController({
      type: 'host',
      allowUnsafeHost: true,
    });
    const sandbox = await controller.create();
    expect(sandbox.type).toBe('host');
    expect(sandbox.containerId).toBeUndefined();
    await controller.destroy(sandbox);
  });

  it('passes hardened flags to docker', async () => {
    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });
    const fakeProc = new EventEmitter() as ChildProcess;
    (fakeProc as unknown as { stdout: Readable }).stdout = stdout;
    (fakeProc as unknown as { stderr: Readable }).stderr = stderr;
    (fakeProc as unknown as { stdin: null }).stdin = null;

    const calls: Array<{ cmd: string; args: string[] }> = [];
    const spawnFn = ((cmd: string, args?: ReadonlyArray<string>) => {
      calls.push({ cmd, args: (args as string[]) ?? [] });
      return fakeProc;
    }) as unknown as typeof spawn;
    const controller = new SandboxController({ spawnFn });

    const promise = (controller as unknown as { startDockerContainer: (id: string, workDir: string) => Promise<string> }).startDockerContainer(
      'abc123',
      '/tmp/work',
    );
    stdout.emit('data', 'container-id');
    fakeProc.emit('close', 0);
    const containerId = await promise;

    expect(containerId).toBe('container-id');
    const args = calls[0].args;
    expect(args).toContain('--network');
    expect(args).toContain('none');
    expect(args).toContain('--cpus');
    expect(args).toContain('--pids-limit');
    expect(args).toContain('--mount');
  });

  it('truncates output beyond configured limit', async () => {
    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });
    const fakeProc = new EventEmitter() as ChildProcess;
    (fakeProc as unknown as { stdout: Readable }).stdout = stdout;
    (fakeProc as unknown as { stderr: Readable }).stderr = stderr;
    (fakeProc as unknown as { stdin: null }).stdin = null;

    const spawnFn = (() => fakeProc) as unknown as typeof spawn;

    const controller = new SandboxController({
      type: 'host',
      allowUnsafeHost: true,
      outputLimitBytes: 8,
      spawnFn,
    });

    const execPromise = controller.exec(
      {
        id: 's1',
        type: 'host',
        workDir: '/tmp',
        logsDir: '/tmp/logs',
        ready: true,
      },
      'echo',
      [],
    );
    stdout.emit('data', '0123456789');
    fakeProc.emit('close', 0);

    const result = await execPromise;
    expect(result.truncated).toBe(true);
    expect(result.stdout).toContain('[output truncated]');
  });
});
