/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ActionProfile, Domain } from './types.js';
import type { Config } from '../../config/config.js';
import * as path from 'node:path';
import * as os from 'node:os';

export function classifyDomain(action: ActionProfile, config: Config): Domain {
  const { touchedPaths } = action;
  const trustedDomains = config.getTrustedDomains(); // Using the getter we added
  const criticalPaths = config.getCriticalPaths(); // Using the getter we added

  // Check for privileged roots
  if (action.roots.some((r) => ['sudo', 'su', 'doas'].includes(r))) {
    return 'system';
  }

  // Check for system-level paths
  if (touchedPaths.some((p) => isSystemPath(p, criticalPaths))) {
    return 'system';
  }

  // Check for workspace paths
  const workspaceRoot = config.getTargetDir();
  // If no paths touched, and no network, default to workspace (e.g. valid read/UI op)
  // But wait, if no paths touched, it might be safer to call it 'workspace' or 'trusted' if it's a known non-file tool.
  // For now, if touchedPaths is empty, we check operations.

  if (
    touchedPaths.length > 0 &&
    touchedPaths.every((p) => isWithinWorkspace(p, workspaceRoot))
  ) {
    return 'workspace';
  }

  // Check network operations
  if (action.operations.includes('network')) {
    const target = getNetworkTarget(action);
    if (!target) return 'untrusted'; // Network op with unknown target

    if (target.startsWith('localhost') || target.startsWith('127.0.0.1')) {
      return 'localhost';
    }
    if (trustedDomains.some((domain) => target.includes(domain))) {
      return 'trusted';
    }
    return 'untrusted';
  }

  // If we have file ops but they are not fully in workspace, and weren't system paths (already checked),
  // then they are 'untrusted' (random paths outside workspace).
  if (touchedPaths.length > 0) {
    return 'untrusted';
  }

  // Default fallback for actions touching nothing (e.g. simple calculations, or pure UI)
  return 'workspace'; // Treat as safe/internal
}

function isSystemPath(p: string, criticalPaths: string[]): boolean {
  const resolved = path.resolve(p);
  return criticalPaths.some((critical) => {
    // Exact match or subdirectory
    // Handle home directory expansion if needed, but criticalPaths normally have full paths or ~ handled elsewhere?
    // The defaults use ~/... so we might need to expand user home.
    // For simplicity here, assume p is absolute or resolved.
    // But config.getCriticalPaths() returns strings like '~/.ssh'.
    // We should probably expand home dir in the config/getter, but let's handle it here if not.
    const expandedCritical = critical.replace(/^~/, os.homedir());
    const resolvedCritical = path.resolve(expandedCritical);
    return (
      resolved === resolvedCritical ||
      resolved.startsWith(resolvedCritical + path.sep)
    );
  });
}

function isWithinWorkspace(p: string, workspace: string): boolean {
  const resolved = path.resolve(p);
  const workspaceResolved = path.resolve(workspace);
  return (
    resolved.startsWith(workspaceResolved + path.sep) ||
    resolved === workspaceResolved
  );
}

function getNetworkTarget(action: ActionProfile): string | null {
  // Extract URL from action args or rawSummary.
  // ActionProfile has networkTargets field if we populated it (Task 4).
  if (action.networkTargets && action.networkTargets.length > 0) {
    return action.networkTargets[0];
  }

  // Fallback to regex on summary if networkTargets missing
  return action.rawSummary.match(/https?:\/\/([^/\s]+)/)?.[1] || null;
}
