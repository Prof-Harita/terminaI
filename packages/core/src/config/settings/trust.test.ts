/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoadedTrustedFolders, isWorkspaceTrusted } from './trust.js';
import { TrustLevel } from './types.js';
import * as fs from 'node:fs';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  realpathSync: {
    native: vi.fn((p) => p),
  },
}));

vi.mock('../../utils/paths.js', () => ({
  isWithinRoot: vi.fn((p, r) => p.startsWith(r)),
}));

describe('LoadedTrustedFolders.isPathTrusted', () => {
  let loaded: LoadedTrustedFolders;

  beforeEach(() => {
    loaded = new LoadedTrustedFolders(
      { path: 'dummy', config: { '/trusted': TrustLevel.TRUST_FOLDER } },
      [],
    );
  });

  it('should return true if folder is explicitly trusted', () => {
    expect(loaded.isPathTrusted('/trusted')).toBe(true);
  });

  it('should return true if parent is trusted via TRUST_PARENT', () => {
    const parentTrusted = new LoadedTrustedFolders(
      { path: 'dummy', config: { '/parent': TrustLevel.TRUST_PARENT } },
      [],
    );
    expect(parentTrusted.isPathTrusted('/parent/child')).toBe(true);
  });

  it('should return undefined if not in list', () => {
    expect(loaded.isPathTrusted('/other')).toBe(undefined);
  });
});

describe('isWorkspaceTrusted', () => {
  it('should return isTrusted: true if folder trust is disabled', () => {
    const settings = { security: { folderTrust: { enabled: false } } };
    expect(isWorkspaceTrusted(settings as any)).toEqual({
      isTrusted: true,
      source: undefined,
    });
  });
});

describe('LoadedTrustedFolders.setValue', () => {
  const MOCK_PATH = '/path/to/trustedFolders.json';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ '/trusted': TrustLevel.TRUST_FOLDER }),
    );
  });

  it('should set new folder trust level and save', () => {
    const loaded = new LoadedTrustedFolders(
      { path: MOCK_PATH, config: {} },
      [],
    );
    loaded.setValue('/new-folder', TrustLevel.TRUST_FOLDER);
    expect(loaded.isPathTrusted('/new-folder')).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
