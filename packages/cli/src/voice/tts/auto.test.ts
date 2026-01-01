/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { resolveAutoTtsProvider } from './auto.js';

describe('resolveAutoTtsProvider', () => {
  it('selects say on macOS when available', () => {
    const provider = resolveAutoTtsProvider({
      platform: 'darwin',
      commandExists: (cmd) => cmd === 'say',
    });
    expect(provider?.name).toBe('say');
  });

  it('selects spd-say on linux when available', () => {
    const provider = resolveAutoTtsProvider({
      platform: 'linux',
      commandExists: (cmd) => cmd === 'spd-say',
    });
    expect(provider?.name).toBe('spd-say');
  });

  it('falls back to espeak on linux', () => {
    const provider = resolveAutoTtsProvider({
      platform: 'linux',
      commandExists: (cmd) => cmd === 'espeak',
    });
    expect(provider?.name).toBe('espeak');
  });

  it('returns null when no provider is available', () => {
    const provider = resolveAutoTtsProvider({
      platform: 'linux',
      commandExists: () => false,
    });
    expect(provider).toBeNull();
  });
});
