/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

const TERMINAI_PREFIX = 'TERMINAI_';
const GEMINI_PREFIX = 'GEMINI_';

/**
 * Mirrors GEMINI_* and TERMINAI_* environment variables for compatibility.
 * TERMINAI_* values always win when both are provided.
 */
export function applyTerminaiEnvAliases(): void {
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(GEMINI_PREFIX)) {
      continue;
    }

    const terminaiKey = `${TERMINAI_PREFIX}${key.slice(GEMINI_PREFIX.length)}`;
    if (value !== undefined && process.env[terminaiKey] === undefined) {
      process.env[terminaiKey] = value;
    }
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(TERMINAI_PREFIX)) {
      continue;
    }

    const geminiKey = `${GEMINI_PREFIX}${key.slice(TERMINAI_PREFIX.length)}`;
    if (value !== undefined) {
      process.env[geminiKey] = value;
    }
  }
}
