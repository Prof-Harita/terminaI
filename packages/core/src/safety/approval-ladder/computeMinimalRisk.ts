/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Outcome, Intention, Domain, RiskScore } from './types.js';

export function computeMinimalRisk(
  outcome: Outcome,
  intention: Intention,
  domain: Domain,
): RiskScore {
  // PIN: Only catastrophic autonomous actions or system critical
  // (Handled by invariants, but Minimal profile specifics here)
  if (outcome === 'irreversible') {
    if (intention === 'autonomous' && domain === 'system') return 'pin';
    if (domain === 'system') return 'pin'; // System irreversible should be PIN
  }

  // CONFIRM: Autonomous irreversible outside workspace
  if (outcome === 'irreversible' && intention === 'autonomous') {
    return 'confirm';
  }

  // PASS: Everything else (user takes responsibility)
  return 'pass';
}
