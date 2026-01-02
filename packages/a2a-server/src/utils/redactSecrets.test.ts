/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { redactSecrets, redactIfSecret } from './redactSecrets.js';

describe('redactSecrets', () => {
  it('redacts apiKey from objects', () => {
    const input = { apiKey: 'AIzaSy123456', user: 'john' };
    const result = redactSecrets(input);
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.user).toBe('john');
  });

  it('redacts nested secret keys', () => {
    const input = {
      auth: { accessToken: 'token123', userId: 42 },
      data: { password: 'secret' },
    };
    const result = redactSecrets(input);
    expect(result.auth.accessToken).toBe('[REDACTED]');
    expect(result.auth.userId).toBe(42);
    expect(result.data.password).toBe('[REDACTED]');
  });

  it('handles arrays correctly', () => {
    const input = [{ apiKey: 'key1' }, { apiKey: 'key2' }];
    const result = redactSecrets(input);
    expect(result[0].apiKey).toBe('[REDACTED]');
    expect(result[1].apiKey).toBe('[REDACTED]');
  });

  it('preserves null and undefined', () => {
    expect(redactSecrets(null)).toBeNull();
    expect(redactSecrets(undefined)).toBeUndefined();
  });

  it('does not redact empty strings', () => {
    const input = { apiKey: '' };
    const result = redactSecrets(input);
    expect(result.apiKey).toBe('');
  });

  it('handles partial key matches like Authorization', () => {
    const input = { Authorization: 'Bearer abc123' };
    const result = redactSecrets(input);
    expect(result.Authorization).toBe('[REDACTED]');
  });
});

describe('redactIfSecret', () => {
  it('redacts strings starting with AIza', () => {
    expect(redactIfSecret('AIzaSy123456')).toBe('[REDACTED]');
  });

  it('redacts strings starting with sk-', () => {
    expect(redactIfSecret('sk-1234567890abcdef')).toBe('[REDACTED]');
  });

  it('does not redact short strings', () => {
    expect(redactIfSecret('hello')).toBe('hello');
  });

  it('returns non-strings as-is', () => {
    expect(redactIfSecret(123)).toBe(123);
    expect(redactIfSecret({ key: 'val' })).toEqual({ key: 'val' });
  });
});
