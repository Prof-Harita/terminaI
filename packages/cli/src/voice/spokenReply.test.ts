/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { deriveSpokenReply } from './spokenReply.js';

describe('deriveSpokenReply', () => {
  it('uses the first sentence when short', () => {
    const input = 'Hello world. Second sentence here.';
    const result = deriveSpokenReply(input, 10);
    expect(result.spokenText).toBe('Hello world.');
    expect(result.truncated).toBe(false);
  });

  it('truncates when above the word limit', () => {
    const input = 'one two three four five six seven eight nine ten';
    const result = deriveSpokenReply(input, 5);
    expect(result.spokenText).toBe('one two three four five...');
    expect(result.truncated).toBe(true);
  });

  it('handles empty input', () => {
    const result = deriveSpokenReply('   ', 5);
    expect(result.spokenText).toBe('');
    expect(result.truncated).toBe(false);
  });

  it('handles non-positive maxWords', () => {
    const result = deriveSpokenReply('hello world', 0);
    expect(result.spokenText).toBe('');
    expect(result.truncated).toBe(false);
  });
});
