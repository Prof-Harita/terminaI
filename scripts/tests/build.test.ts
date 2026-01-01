/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execSyncMock = vi.fn();
const existsSyncMock = vi.fn();

vi.mock('node:child_process', () => ({
  execSync: execSyncMock,
}));

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
}));

describe('scripts/build.js', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    execSyncMock.mockReset();
    existsSyncMock.mockReset();
    process.env = {
      ...originalEnv,
      TERMINAI_BUILD_TEST: '1',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('fails fast when node_modules is missing', async () => {
    existsSyncMock.mockReturnValue(false);

    await expect(import('../build.js')).rejects.toThrow(/Missing node_modules/);
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('does not attempt installs when node_modules is present', async () => {
    existsSyncMock.mockReturnValue(true);

    await import('../build.js');

    const installCalls = execSyncMock.mock.calls.filter((call) =>
      String(call[0]).includes('npm install'),
    );
    expect(installCalls).toHaveLength(0);
  });
});
