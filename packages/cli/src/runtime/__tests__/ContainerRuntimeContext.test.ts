/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as childProcess from 'node:child_process';
import { ContainerRuntimeContext } from '../ContainerRuntimeContext.js';

vi.mock('node:child_process', () => {
  return {
    execSync: vi.fn(),
    execFile: vi.fn(),
    spawn: vi.fn(),
  };
});

const cliVersion = process.env['TERMINAI_CLI_VERSION'] || '0.28.0';

describe('ContainerRuntimeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect OCI runtime failure and report it', async () => {
    const context = new ContainerRuntimeContext(cliVersion);

    (childProcess.execSync as any).mockReturnValue('container-id-123');
    await context.initialize();

    const ociError =
      'OCI runtime exec failed: exec failed: unable to start container process: exec: "nosuchcommand": executable file not found in $PATH: unknown';
    (childProcess.execFile as any).mockImplementation((...args: any[]) => {
      const callback = args.find((arg) => typeof arg === 'function');
      if (callback) callback(new Error('failed'), '', ociError);
    });

    const result = await context.execute('nosuchcommand');
    console.log('DEBUG RESULT:', JSON.stringify(result));
    expect(result.runtimeError).toBeDefined();
    expect(result.runtimeError).toContain('Container runtime error detected');
    expect(result.exitCode).toBe(126);
  });
});

// Task 12: Add integration tests for container mount validation
describe('workspace mounting', () => {
  it('should mount workspace directory in container', async () => {
    const context = new ContainerRuntimeContext(cliVersion);
    (childProcess.execSync as any).mockReturnValue('container-id-123');

    const workspacePath = '/tmp/test-workspace';
    await context.initialize(workspacePath);

    // Verify docker run command was called with correct -v flag
    expect(childProcess.execSync).toHaveBeenCalledWith(
      expect.stringContaining(`-v "${workspacePath}:${workspacePath}"`),
      expect.any(Object),
    );
  });

  it('should fail gracefully when accessing unmounted path', async () => {
    const context = new ContainerRuntimeContext(cliVersion);
    (childProcess.execSync as any).mockReturnValue('container-id-123');

    await context.initialize('/tmp/mounted');

    // Mock docker exec to fail for unmounted path check
    (childProcess.execFile as any).mockImplementation((...args: any[]) => {
      const callback = args.find((arg) => typeof arg === 'function');

      // Should fail preflight check
      if (args.includes('test -d "/home/unmounted" && echo OK')) {
        callback(null, '', 'test: /home/unmounted: bin: test: unknown operand');
        return;
      }
      callback(null, 'OK', '');
    });

    const result = await context.execute('ls /home/unmounted', {
      cwd: '/home/unmounted',
    });

    // Current implementation warns and proceeds, but execute() returns runtime error if preflight check fails?
    // Let's check the preflight logic in ContainerRuntimeContext.ts:
    // if (!checkResult.stdout.includes('OK')) -> return { error... }

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(
      'Container error: directory "/home/unmounted" does not exist',
    );
  });

  it('should translate workspace paths correctly', async () => {
    const context = new ContainerRuntimeContext(cliVersion);
    (childProcess.execSync as any).mockReturnValue('container-id-123');

    const workspacePath = '/tmp/test-workspace';
    await context.initialize(workspacePath);

    // Mock success for preflight check of Translated Path
    (childProcess.execFile as any).mockImplementation((...args: any[]) => {
      const callback = args.find((arg) => typeof arg === 'function');
      // The execute command does preflight check on translated path logic
      // const containerCwd = this.translatePath(hostCwd);
      // Verify we are checking the CONTAINER path (which is same as host in identity mount)
      if (args.flat().join(' ').includes(`test -d "${workspacePath}"`)) {
        callback(null, 'OK', '');
        return;
      }
      callback(null, 'result', '');
    });

    await context.execute('ls', { cwd: workspacePath });

    // Ensure execFile was called with allowlisted CWD
    // Since we use identity mount, it should be the same
    expect(childProcess.execFile).toHaveBeenCalledWith(
      'docker',
      expect.arrayContaining(['-w', workspacePath]),
      expect.any(Object),
      expect.any(Function),
    );
  });
});
