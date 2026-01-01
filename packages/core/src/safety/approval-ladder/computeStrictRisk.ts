/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Outcome, Intention, Domain, RiskScore } from './types.js';

export function computeStrictRisk(
  outcome: Outcome,
  intention: Intention,
  domain: Domain,
): RiskScore {
  // PIN: Irreversible + (Autonomous OR System OR Untrusted)
  if (outcome === 'irreversible') {
    if (intention === 'autonomous') return 'pin';
    if (domain === 'system') return 'pin';
    if (domain === 'untrusted') return 'pin';
    return 'confirm'; // Explicit irreversible in workspace
  }

  // CONFIRM: Any modification or external access
  if (outcome === 'soft-irreversible') return 'confirm';
  if (domain === 'untrusted') return 'confirm';
  if (intention === 'autonomous' && outcome !== 'reversible') return 'confirm';

  // LOG: Trusted network operations (even if reversible)
  // Assuming network ops are classified as trusted by domain.
  if (domain === 'trusted' || domain === 'localhost') return 'log';

  // PASS: Pure reads in workspace
  return 'pass';
}
