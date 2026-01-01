/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ActionProfile,
  DeterministicReviewResult,
  ReviewLevel,
} from './types.js';
import type { Config } from '../../config/config.js';
import { classifyOutcome } from './classifyOutcome.js';
import { classifyDomain } from './classifyDomain.js';
import { computeRisk } from './computeRisk.js';
import { isGitTracked } from '../../utils/gitHelpers.js';

/**
 * Computes the minimum required review level (A/B/C) for an action.
 * Uses the new three-axis security model (Outcome, Intention, Domain).
 *
 * @param profile The action profile to evaluate
 * @param config The application configuration
 * @returns Deterministic review result with level and requirements
 */
export function computeMinimumReviewLevel(
  profile: ActionProfile,
  config: Config,
): DeterministicReviewResult {
  const reasons: string[] = [];

  // Rule: Low parse confidence → C (Safety Invariant)
  if (profile.parseConfidence === 'low') {
    return {
      level: 'C',
      reasons: ['Parse confidence is low - cannot safely reason about action'],
      requiresClick: true,
      requiresPin: true,
    };
  }

  // Rule: Unbounded scope signals -> C (Safety Invariant)
  if (profile.hasUnboundedScopeSignals) {
    // We continue to full classification to get all reasons, but ensure C + specific message
    reasons.push('Delete operation with unbounded scope (/, ~, wildcards)');
  }

  // Helper functions for classifiers
  const _isGitTracked = (p: string) => isGitTracked(p, config.getTargetDir());
  const _isInWorkspace = (p: string) => {
    const ws = config.getWorkspaceContext();
    return ws ? ws.isPathWithinWorkspace(p) : false; // fallback or logic
  };

  // Run Classifiers
  const outcome = classifyOutcome(profile, _isGitTracked, _isInWorkspace);
  const domain = classifyDomain(profile, config);

  // Derive intention from provenance (I-2 fix: classifyIntention requires conversation
  // history which is not available here, so we use provenance as a proxy)
  let intention: 'explicit' | 'task-derived' | 'autonomous' = 'autonomous';
  if (
    profile.provenance.includes('local_user') ||
    profile.provenance.includes('web_remote_user')
  ) {
    intention = 'explicit';
  } else if (profile.provenance.includes('tool_output')) {
    // Chained tool calls are considered task-derived
    intention = 'task-derived';
  }

  // Compute Risk
  const securityProfile = config.getSecurityProfile();
  const risk = computeRisk(
    outcome,
    intention,
    domain,
    securityProfile,
    profile.hasUnboundedScopeSignals,
  );

  // Map Risk to ReviewLevel
  let level: ReviewLevel = 'A';
  if (risk === 'pin') {
    level = 'C';
    reasons.push(`High risk action (${securityProfile} profile)`);
  } else if (risk === 'confirm') {
    level = 'B';
    reasons.push(`Medium risk action (${securityProfile} profile)`);
  } else if (risk === 'log') {
    level = 'A';
    reasons.push('Logged action');
  } else {
    level = 'A';
  }

  // Add specific reasons (Run before invariants to ensure complete reasoning)
  if (level === 'A' && outcome === 'reversible' && domain === 'workspace') {
    reasons.push('Action is read-only, bounded, and reversible');
  }
  if (domain === 'system') {
    reasons.push('Privileged operation (sudo/doas/su)');
  }
  if (profile.operations.includes('ui')) {
    reasons.push('UI automation requires user review');
  }
  if (profile.operations.includes('delete')) {
    reasons.push('Delete operation detected');
  }
  if (profile.outsideWorkspace) {
    reasons.push('Action touches paths outside workspace');
    if (domain === 'system' || profile.operations.includes('privileged')) {
      reasons.push('Privileged operation outside workspace');
    }
  }
  if (profile.operations.includes('device')) {
    reasons.push('Action involves device-level operations');
  }
  if (
    profile.provenance.includes('web_remote_user') &&
    profile.operations.some((op) => op !== 'read')
  ) {
    level = 'C';
    reasons.push('Action from web remote user (non-read)');
  }
  if (domain === 'untrusted' && profile.operations.includes('network')) {
    reasons.push('Network operation with untrusted provenance');
  }

  // Rule: Outside workspace operations -> C (Safety Invariant)
  // Applied AFTER reason generation so we include all reasons
  if (profile.outsideWorkspace) {
    return {
      level: 'C',
      reasons:
        reasons.length > 0
          ? reasons
          : ['Action touches paths outside workspace'],
      requiresClick: true,
      requiresPin: true,
    };
  }

  return {
    level,
    reasons,
    requiresClick: level === 'B' || level === 'C',
    requiresPin: level === 'C',
  };
}
