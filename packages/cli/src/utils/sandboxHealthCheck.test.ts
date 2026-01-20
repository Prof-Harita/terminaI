/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { exec } from 'node:child_process';
import { runSandboxHealthCheck } from './sandboxHealthCheck.js';

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('node:util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:util')>();
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    promisify: (fn: any) => {
      if (fn === exec) {
        return (cmd: string) => {
          if (global.__MOCK_EXEC_RESULT__?.[cmd]) {
            const res = global.__MOCK_EXEC_RESULT__[cmd];
            if (res.exitCode === 0) {
              return Promise.resolve({ stdout: res.stdout || '', stderr: '' });
            } else {
              const err = new Error(`Command failed: ${cmd}`);
              (err as any).stderr = res.stderr || 'error';
              (err as any).stdout = '';
              return Promise.reject(err);
            }
          }
          return Promise.resolve({ stdout: '', stderr: '' });
        };
      }
      return actual.promisify(fn);
    },
  };
});

declare global {
  var __MOCK_EXEC_RESULT__: Record<
    string,
    { exitCode: number; stdout?: string; stderr?: string }
  >;
}

describe('runSandboxHealthCheck', () => {
  const image = 'ghcr.io/prof-harita/terminai/sandbox:0.27.0';
  const cmd = 'docker';

  beforeEach(() => {
    vi.clearAllMocks();
    global.__MOCK_EXEC_RESULT__ = {};
  });

  it('should pass when all checks succeed', async () => {
    const result = await runSandboxHealthCheck(cmd, image);
    expect(result.success).toBe(true);
  });

  it('should fail when T-APTS is missing', async () => {
    const check = `python3 -c "import terminai_apts; print('T-APTS OK')"`;
    const fullCmd = `${cmd} run --rm ${image} ${check}`;

    global.__MOCK_EXEC_RESULT__ = {
      [fullCmd]: {
        exitCode: 1,
        stderr: "ModuleNotFoundError: No module named 'terminai_apts'",
      },
    };

    const result = await runSandboxHealthCheck(cmd, image);
    expect(result.success).toBe(false);
    expect(result.error).toContain('ModuleNotFoundError');
  });

  it('should fail when ObjectTableLabels.TRANSIT is missing', async () => {
    const check = `python3 -c "from apts.model import ObjectTableLabels; assert hasattr(ObjectTableLabels,'TRANSIT'), 'Missing TRANSIT'"`;
    const fullCmd = `${cmd} run --rm ${image} ${check}`;

    global.__MOCK_EXEC_RESULT__ = {
      [fullCmd]: { exitCode: 1, stderr: 'AssertionError: Missing TRANSIT' },
    };

    const result = await runSandboxHealthCheck(cmd, image);
    expect(result.success).toBe(false);
    expect(result.error).toContain('AssertionError: Missing TRANSIT');
  });
});
