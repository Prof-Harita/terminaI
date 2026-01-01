/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Outcome, Intention, Domain, RiskScore } from './types.js';

export function computeBalancedRisk(
  outcome: Outcome,
  intention: Intention,
  domain: Domain,
): RiskScore {
  // PIN: Irreversible + (Autonomous OR System OR Untrusted)
  if (outcome === 'irreversible') {
    // Note: Invariants handle most PIN cases, but we reinforce here
    if (intention === 'autonomous') {
      // Exception: Workspace operations are CONFIRM even if irreversible (e.g. delete untracked)
      if (domain === 'workspace') return 'confirm';
      return 'pin';
    }
    if (domain === 'system') return 'pin';
    if (domain === 'untrusted') return 'pin';
    return 'confirm';
  }

  // CONFIRM: Deletes or autonomous modifications
  if (outcome === 'soft-irreversible') {
    if (intention === 'autonomous') return 'confirm';
    if (domain === 'workspace' && intention === 'explicit') {
      // Explicit workspace delete is soft-irreversible.
      // Balanced Mode logic: "Still confirms: Deletes"
      return 'confirm';
    }
    return 'confirm'; // Safe default
  }

  // PASS: Reversible workspace operations
  if (outcome === 'reversible') {
    if (domain === 'workspace') return 'pass';
    if (domain === 'trusted') return 'pass';
    if (domain === 'localhost') return 'pass';
    // Reversible but untrusted?
    if (domain === 'untrusted') return 'log';
  }

  // Default fallback
  return 'confirm';
}
