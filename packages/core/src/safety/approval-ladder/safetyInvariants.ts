/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Critical system paths that always require PIN
 */
export const SYSTEM_CRITICAL_PATHS = [
  '/',
  '/etc',
  '/usr',
  '/bin',
  '/sbin',
  '/var',
  '/boot',
] as const;

/**
 * User-level critical paths
 */
export const USER_CRITICAL_PATHS = [
  '~/.ssh',
  '~/.aws',
  '~/.gnupg',
  '~/.config',
] as const;

/**
 * Patterns indicating unbounded scope
 */
export const UNBOUNDED_SCOPE_PATTERNS = [
  /^\/$/, // Root
  /^\/\*+$/, // Root with wildcards
  /^~$/, // Home
  /^~\/\*+$/, // Home with wildcards
] as const;

import type { Outcome, Intention, Domain } from './types.js';

export type RiskScore = 'pass' | 'log' | 'confirm' | 'pin';

/**
 * Checks immutable safety invariants that must always trigger high security.
 */
export function checkSafetyInvariants(
  outcome: Outcome,
  intention: Intention,
  domain: Domain,
  hasUnboundedScope: boolean,
): RiskScore | null {
  // Rule 1: Unbounded system deletes
  // e.g. rm -rf /
  if (outcome === 'irreversible' && domain === 'system' && hasUnboundedScope) {
    return 'pin';
  }

  // Rule 2: Autonomous irreversible actions
  // Agent decided to delete something irreversible on its own
  if (outcome === 'irreversible' && intention === 'autonomous') {
    return 'pin';
  }

  // Rule 3: System domain always needs confirmation minimum
  // Modifications to /etc, etc.
  if (domain === 'system') {
    return outcome === 'irreversible' ? 'pin' : 'confirm';
  }

  return null; // No invariant triggered
}

/**
 * Checks if any touched paths are critical paths (immutable Rule 3 variant).
 * @returns 'pin' if critical path is touched, null otherwise
 */
export function checkCriticalPaths(touchedPaths: string[]): RiskScore | null {
  const allCritical = [
    ...SYSTEM_CRITICAL_PATHS,
    ...USER_CRITICAL_PATHS.map((p) =>
      p.replace(/^~/, process.env['HOME'] || ''),
    ),
  ];

  for (const touched of touchedPaths) {
    for (const critical of allCritical) {
      // Direct match or exact parent (e.g. touching /etc/passwd when critical is /etc)
      if (touched === critical || touched.startsWith(critical + '/')) {
        return 'pin';
      }
    }
  }

  return null;
}
