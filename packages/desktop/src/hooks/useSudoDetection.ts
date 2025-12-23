/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

const SUDO_PATTERNS = [
  /\[sudo\] password for/i,
  /Password:/i,
  /Enter passphrase/i,
  /Enter PIN/i,
  /passcode:/i,
];

export interface SudoDetectionResult {
  needsPassword: boolean;
  prompt: string;
}

export function useSudoDetection(outputBuffer: string): SudoDetectionResult {
  // Check the last 500 characters for password prompts
  const recent = outputBuffer.slice(-500);

  for (const pattern of SUDO_PATTERNS) {
    const match = recent.match(pattern);
    if (match) {
      return { needsPassword: true, prompt: match[0] };
    }
  }

  return { needsPassword: false, prompt: '' };
}
