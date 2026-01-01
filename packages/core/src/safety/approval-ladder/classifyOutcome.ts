/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ActionProfile } from './types.js';
import type { Outcome } from './types.js';

export function classifyOutcome(
  action: ActionProfile,
  isGitTracked: (path: string) => boolean,
  isInWorkspace: (path: string) => boolean,
): Outcome {
  const { operations, touchedPaths, hasUnboundedScopeSignals } = action;

  // Irreversible: Cannot be undone
  if (hasUnboundedScopeSignals) return 'irreversible';

  // Specific Git handling
  if (
    (action.roots[0] === 'git' && action.roots.includes('commit')) ||
    (action.roots[0] === 'git' && action.rawSummary.startsWith('git commit'))
  ) {
    return 'reversible';
  }

  // Device operations are irreversible
  if (operations.includes('device')) {
    return 'irreversible';
  }

  // Privileged operations are at least soft-irreversible
  // (System state changes are not easily reversible)
  if (action.roots.some((r) => ['sudo', 'su', 'doas'].includes(r))) {
    return 'soft-irreversible';
  }

  if (operations.includes('write')) {
    // Write outside workspace is irreversible (can't guarantee safety/git tracking)
    if (touchedPaths.some((p) => !isInWorkspace(p))) {
      return 'irreversible';
    }
    // Git-tracked writes are reversible
    if (touchedPaths.length > 0 && touchedPaths.every(isGitTracked)) {
      return 'reversible';
    }
    // New files, untracked files, or unknown paths (empty touchedPaths): soft-irreversible
    return 'soft-irreversible';
  }

  // Network mutations are soft-irreversible
  // We treat all network ops as potential mutations for now unless we sniff HTTP method
  if (operations.includes('network')) {
    return 'soft-irreversible';
  }

  // Browser/UI actions are soft-irreversible
  if (
    action.toolName === 'browser_action' ||
    action.toolName === 'computer' ||
    operations.includes('ui')
  ) {
    return 'soft-irreversible';
  }

  // Deletes are generally irreversible
  if (operations.includes('delete')) {
    if (touchedPaths.length > 0 && touchedPaths.every(isInWorkspace)) {
      // Workspace delete is soft-irreversible (can be re-downloaded or git checkout)
      return 'soft-irreversible';
    }
    if (touchedPaths.every(isGitTracked)) return 'soft-irreversible';
    return 'irreversible';
  }

  return 'reversible';
}
