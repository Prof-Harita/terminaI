/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { runSandboxHealthCheck } from './sandboxHealthCheck.js';
import { start_sandbox } from './sandbox.js';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

vi.mock('node:child_process');
vi.mock('node:util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:util')>();
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    promisify: (fn: any) => {
      if (fn.name === 'exec') {
        return (cmd: string) => {
          if (cmd.includes('python3 -c')) {
            return Promise.resolve({ stdout: 'T-APTS OK', stderr: '' });
          }
          return Promise.resolve({ stdout: '', stderr: '' });
        };
      }
      return actual.promisify(fn);
    },
  };
});

describe('Sandbox E2E: Cleanup Downloads Scenario', () => {
  const image = 'ghcr.io/prof-harita/terminai/sandbox:0.27.0';
  const cmd = 'docker';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GEMINI_CLI_INTEGRATION_TEST'] = 'true';
  });

  it('should successfully run cleanup_downloads in sandbox', async () => {
    // 1. Health check passes
    const hcResult = await runSandboxHealthCheck(cmd, image);
    expect(hcResult.success).toBe(true);

    // 2. Start sandbox with cleanup command
    interface MockProcess extends EventEmitter {
      stdout: EventEmitter;
      stderr: EventEmitter;
    }
    const mockSpawnProcess = new EventEmitter() as MockProcess;
    mockSpawnProcess.stdout = new EventEmitter();
    mockSpawnProcess.stderr = new EventEmitter();

    vi.mocked(spawn).mockImplementation((_cmd, args) => {
      // Mock docker image check
      if (args && args[0] === 'images') {
        const p = new EventEmitter() as MockProcess;
        p.stdout = new EventEmitter();
        setTimeout(() => {
          p.stdout.emit('data', Buffer.from('image-id'));
          p.emit('close', 0);
        }, 1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return p as any;
      }
      // Mock docker run
      if (args && args[0] === 'run') {
        setTimeout(() => {
          mockSpawnProcess.emit('close', 0);
        }, 10);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return mockSpawnProcess as any;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new EventEmitter() as any;
    });

    const cleanupCmd =
      "python3 -c 'from terminai_apts.action import cleanup_downloads; import json; print(json.dumps(cleanup_downloads()))'";
    // The entrypoint function in sandboxUtils slices the first 2 arguments (expecting node/script)
    const exitCode = await start_sandbox(
      { command: 'docker', image },
      [],
      undefined,
      ['', '', cleanupCmd],
    );

    expect(exitCode).toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      'docker',
      expect.arrayContaining([
        'run',
        '--rm',
        image,
        expect.stringContaining('cleanup_downloads'),
      ]),
      expect.any(Object),
    );
  });
});
