/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Outcome,
  Intention,
  Domain,
  SecurityProfile,
  RiskScore,
} from './types.js';
import { computeStrictRisk } from './computeStrictRisk.js';
import { computeBalancedRisk } from './computeBalancedRisk.js';
import { computeMinimalRisk } from './computeMinimalRisk.js';
import { checkSafetyInvariants } from './safetyInvariants.js';

export function computeRisk(
  outcome: Outcome,
  intention: Intention,
  domain: Domain,
  profile: SecurityProfile,
  hasUnboundedScope: boolean,
): RiskScore {
  // Safety invariants override all profiles
  const invariantLevel = checkSafetyInvariants(
    outcome,
    intention,
    domain,
    hasUnboundedScope,
  );
  if (invariantLevel) return invariantLevel;

  // Route to profile-specific logic
  switch (profile) {
    case 'strict':
      return computeStrictRisk(outcome, intention, domain);
    case 'balanced':
      return computeBalancedRisk(outcome, intention, domain);
    case 'minimal':
      return computeMinimalRisk(outcome, intention, domain);
    default:
      // Unknown profile, fail closed
      return 'confirm';
  }
}
