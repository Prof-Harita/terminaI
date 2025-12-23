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

/**
 * Computes the minimum required review level (A/B/C) for an action.
 *
 * This function implements deterministic safety rules to ensure actions
 * have appropriate user oversight. The LLM/brain may escalate but never
 * downgrade below this minimum.
 *
 * Rules (applied in order):
 * 1. Start at level A
 * 2. If parseConfidence is 'low' → level C (cannot reason about action)
 * 3. If operations include 'device' → level C
 * 4. If operations include 'delete':
 *    - If hasUnboundedScopeSignals → level C
 *    - Else → at least level B
 * 5. If operations include 'privileged':
 *    - If outsideWorkspace → level C
 *    - Else → at least level B
 * 6. If operations include 'write' → at least level B
 * 7. If operations include 'process' → at least level B
 * 8. If operations include 'network' → at least level B (and add extra caution for untrusted provenance)
 * 9. If outsideWorkspace → bump one level (A→B, B→C)
 * 10. If provenance includes 'web_remote_user' and not pure read → bump one level
 *
 * @param profile The action profile to evaluate
 * @returns Deterministic review result with level and requirements
 */
export function computeMinimumReviewLevel(
  profile: ActionProfile,
): DeterministicReviewResult {
  const reasons: string[] = [];
  let level: ReviewLevel = 'A';

  const isLowImpactGitWrite =
    profile.roots.includes('git') &&
    !profile.outsideWorkspace &&
    !profile.operations.includes('network') &&
    !profile.operations.includes('delete') &&
    !profile.operations.includes('privileged') &&
    /^git\s+(commit|add|restore|stash|status|diff|log|show)(\s|$)/i.test(
      profile.rawSummary.trim(),
    );

  // Helper to bump level
  const bumpLevel = (from: ReviewLevel, reason: string): ReviewLevel => {
    reasons.push(reason);
    if (from === 'A') return 'B';
    if (from === 'B') return 'C';
    return 'C';
  };

  // Helper to set minimum level
  const setMinLevel = (min: ReviewLevel, reason: string): void => {
    if (level === 'A' && (min === 'B' || min === 'C')) {
      level = min;
      reasons.push(reason);
    } else if (level === 'B' && min === 'C') {
      level = min;
      reasons.push(reason);
    }
  };

  // Rule 2: Low parse confidence → C
  if (profile.parseConfidence === 'low') {
    level = 'C';
    reasons.push('Parse confidence is low - cannot safely reason about action');
    // Early return since C is maximum
    return {
      level: 'C',
      reasons,
      requiresClick: true,
      requiresPin: true,
    };
  }

  // Rule 3: Device operations → C
  if (profile.operations.includes('device')) {
    level = 'C';
    reasons.push('Action involves device-level operations');
    return {
      level: 'C',
      reasons,
      requiresClick: true,
      requiresPin: true,
    };
  }

  // Unknown semantics → at least B
  if (profile.operations.includes('unknown')) {
    setMinLevel('B', 'Command semantics are unknown; require user review');
  }

  // Rule 4: Delete operations
  if (profile.operations.includes('delete')) {
    if (profile.hasUnboundedScopeSignals) {
      level = 'C';
      reasons.push('Delete operation with unbounded scope (/, ~, wildcards)');
      return {
        level: 'C',
        reasons,
        requiresClick: true,
        requiresPin: true,
      };
    } else {
      setMinLevel('B', 'Delete operation detected');
    }
  }

  // Rule 5: Privileged operations
  if (profile.operations.includes('privileged')) {
    if (profile.outsideWorkspace) {
      level = 'C';
      reasons.push('Privileged operation outside workspace');
      return {
        level: 'C',
        reasons,
        requiresClick: true,
        requiresPin: true,
      };
    } else {
      setMinLevel('B', 'Privileged operation (sudo/doas/su)');
    }
  }

  // Rule 6: Write operations
  if (profile.operations.includes('write')) {
    if (!isLowImpactGitWrite) {
      setMinLevel('B', 'Write operation detected');
    } else {
      reasons.push('Low-impact git operation (reversible)');
    }
  }

  // Rule 7: Process operations
  if (profile.operations.includes('process')) {
    setMinLevel('B', 'Process operation detected');
  }

  // Rule 8: Network operations
  if (profile.operations.includes('network')) {
    setMinLevel('B', 'Network operation detected');
    const untrustedSources = ['web_content', 'workspace_file', 'tool_output'];
    if (profile.provenance.some((p) => untrustedSources.includes(p))) {
      reasons.push('Network operation with untrusted provenance');
    }
  }

  // Rule 9: Outside workspace → bump level
  if (profile.outsideWorkspace) {
    level = bumpLevel(level, 'Action touches paths outside workspace');
  }

  // Rule 10: Web remote user provenance for non-read operations
  if (profile.provenance.includes('web_remote_user')) {
    const isPureRead =
      profile.operations.length === 1 && profile.operations[0] === 'read';
    if (!isPureRead) {
      level = bumpLevel(level, 'Action from web remote user (non-read)');
    }
  }

  // If no reasons were added, it's a safe Level A action
  if (reasons.length === 0) {
    reasons.push('Action is read-only, bounded, and reversible');
  }

  return {
    level,
    reasons,
    requiresClick: level !== 'A',
    requiresPin: level === 'C',
  };
}
