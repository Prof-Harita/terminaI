/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const mockHostname = vi.hoisted(() => vi.fn());
const mockUserInfo = vi.hoisted(() => vi.fn());
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockExecSync = vi.hoisted(() => vi.fn());

vi.mock('node:os', () => ({
  default: {
    hostname: mockHostname,
    userInfo: mockUserInfo,
  },
  hostname: mockHostname,
  userInfo: mockUserInfo,
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: mockExistsSync,
  },
  existsSync: mockExistsSync,
}));

vi.mock('node:child_process', () => ({
  execSync: mockExecSync,
}));

import {
  detectEnvironment,
  getCeremonyMultiplier,
} from '../environmentDetector.js';

describe('environmentDetector', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env['NODE_ENV'] = undefined;
    mockHostname.mockReturnValue('dev-machine');
    mockUserInfo.mockReturnValue({ username: 'test' });
    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockReturnValue(Buffer.from(''));
  });

  afterEach(() => {
    process.env['NODE_ENV'] = undefined;
  });

  it('detects prod by hostname', () => {
    mockHostname.mockReturnValue('prod-server');
    expect(detectEnvironment()).toBe('prod');
  });

  it('detects dev by hostname', () => {
    mockHostname.mockReturnValue('local-laptop');
    expect(detectEnvironment()).toBe('dev');
  });

  it('detects staging by hostname', () => {
    mockHostname.mockReturnValue('staging-box');
    expect(detectEnvironment()).toBe('staging');
  });

  it('detects prod when docker containers include prod', () => {
    mockExistsSync.mockImplementation((path) => path === '/var/run/docker.sock');
    mockExecSync.mockReturnValue(Buffer.from('prod-service\n'));
    expect(detectEnvironment()).toBe('prod');
  });

  it('detects prod on server-like signals', () => {
    mockHostname.mockReturnValue('app');
    mockExistsSync.mockImplementation(
      (path) =>
        path === '/etc/nginx/sites-enabled' || path === '/run/systemd/system',
    );
    expect(detectEnvironment()).toBe('prod');
  });

  it('returns ceremony multipliers per environment', () => {
    expect(getCeremonyMultiplier('dev')).toBe(1);
    expect(getCeremonyMultiplier('staging')).toBe(1.3);
    expect(getCeremonyMultiplier('prod')).toBe(1.8);
    expect(getCeremonyMultiplier('unknown')).toBe(1.5);
  });
});
