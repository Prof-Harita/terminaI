/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export type RiskLevel =
  | 'read'
  | 'write'
  | 'delete'
  | 'privileged'
  | 'dangerous';

const DANGEROUS_PATTERNS = [
  /\brm\s+(-rf?|--recursive)\s+\/(?!\S)/i,
  /\brm\s+(-rf?|--recursive)\s+~\b/i,
  /\bdd\s+/i,
  /\bmkfs\b/i,
  /\bformat\b/i,
];

const PRIVILEGED_PATTERNS = [/\bsudo\b/i, /\bdoas\b/i, /\bsu\s+-c\b/i];

const DELETE_PATTERNS = [/\brm\b/i, /\brmdir\b/i, /\bunlink\b/i];

const WRITE_PATTERNS = [
  /\bmv\b/i,
  /\bcp\b/i,
  /\btouch\b/i,
  /\bmkdir\b/i,
  /\btee\b/i,
  />\s*[^\s]/,
];

export function classifyRisk(command: string): RiskLevel {
  const normalized = command.trim();
  if (DANGEROUS_PATTERNS.some((p) => p.test(normalized))) return 'dangerous';
  if (PRIVILEGED_PATTERNS.some((p) => p.test(normalized))) return 'privileged';
  if (DELETE_PATTERNS.some((p) => p.test(normalized))) return 'delete';
  if (WRITE_PATTERNS.some((p) => p.test(normalized))) return 'write';
  return 'read';
}
