/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Patterns that indicate a value may contain sensitive information.
 */
const SECRET_KEYS = [
  'apiKey',
  'api_key',
  'apikey',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'secret',
  'password',
  'token',
  'credential',
  'authorization',
  'bearer',
];

const REDACTED = '[REDACTED]';

/**
 * Recursively redacts values from an object that match secret key patterns.
 * Used to sanitize error objects and request payloads before logging.
 */
export function redactSecrets<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Don't redact strings at top level—only object properties
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as unknown as T;
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const keyLower = key.toLowerCase();
      const isSecret = SECRET_KEYS.some(
        (pattern) =>
          keyLower === pattern.toLowerCase() ||
          keyLower.includes(pattern.toLowerCase()),
      );

      if (isSecret && typeof val === 'string' && val.length > 0) {
        result[key] = REDACTED;
      } else {
        result[key] = redactSecrets(val);
      }
    }
    return result as T;
  }

  return value;
}

/**
 * Redacts a single string value if it appears to be a secret (e.g. API key).
 * Returns the original value if it's not string-like.
 */
export function redactIfSecret(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  // Heuristic: API keys are typically long alphanumeric strings
  if (/^(AIza|sk-|ghp_|ghu_)/.test(value) || value.length > 30) {
    return REDACTED;
  }
  return value;
}
