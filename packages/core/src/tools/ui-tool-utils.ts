/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'node:crypto';
import type { UiActionResult } from '../gui/protocol/types.js';
import type { ToolExecuteConfirmationDetails, ToolResult } from './tools.js';
import type { ActionProfile, Provenance } from '../safety/approval-ladder/types.js';
import { computeMinimumReviewLevel } from '../safety/approval-ladder/computeMinimumReviewLevel.js';

type UiConfirmationArgs = {
  toolName: string;
  description: string;
  provenance?: Provenance[];
  title?: string;
  onConfirm: ToolExecuteConfirmationDetails['onConfirm'];
};

function normalizeProvenance(provenance?: Provenance[]): Provenance[] {
  if (!provenance || provenance.length === 0) {
    return ['unknown'];
  }
  const unique = new Set<Provenance>();
  const merged: Provenance[] = [];
  for (const entry of provenance) {
    if (!unique.has(entry)) {
      unique.add(entry);
      merged.push(entry);
    }
  }
  return merged;
}

export function buildUiConfirmationDetails({
  toolName,
  description,
  provenance,
  title,
  onConfirm,
}: UiConfirmationArgs): ToolExecuteConfirmationDetails | false {
  const normalizedProvenance = normalizeProvenance(provenance);
  const actionProfile: ActionProfile = {
    toolName,
    operations: ['ui'],
    roots: [toolName],
    touchedPaths: [],
    outsideWorkspace: false,
    usesPrivilege: false,
    hasUnboundedScopeSignals: false,
    parseConfidence: 'high',
    provenance: normalizedProvenance,
    rawSummary: description,
  };
  const reviewResult = computeMinimumReviewLevel(actionProfile);
  if (reviewResult.level === 'A') {
    return false;
  }
  return {
    type: 'exec',
    title: title ?? 'Confirm UI Action',
    command: description,
    rootCommand: toolName,
    provenance: normalizedProvenance.length > 0 ? normalizedProvenance : undefined,
    reviewLevel: reviewResult.level,
    requiresPin: reviewResult.requiresPin,
    pinLength: reviewResult.requiresPin ? 6 : undefined,
    explanation: reviewResult.reasons.join('; '),
    onConfirm,
  };
}

export function formatUiResult(
  result: UiActionResult,
  toolName: string,
): ToolResult {
  const success = result.status === 'success';

  // Construct LLM Content (JSON)
  const jsonContent = JSON.stringify(result, null, 2);

  // Evidence Hash
  let evidenceHash: string | undefined;
  if (result.evidence?.snapshotId || result.data) {
    const input =
      (result.evidence?.snapshotId || '') + JSON.stringify(result.data || {});
    evidenceHash = createHash('sha256')
      .update(input)
      .digest('hex')
      .slice(0, 16);
  }

  // Construct Markdown Display
  let md = success
    ? `### ✅ ${toolName} Success\n`
    : `### ❌ ${toolName} Failed\n`;
  if (result.message) {
    md += `**Message:** ${result.message}\n\n`;
  }

  if (result.resolvedTarget) {
    md += `**Target:** ${result.resolvedTarget.role} "${
      result.resolvedTarget.name || ''
    }" (Confidence: ${result.resolvedTarget.confidence})\n`;
  }

  if (result.verification) {
    md += `**Verification:** ${
      result.verification.passed ? 'PASSED' : 'FAILED'
    } - ${result.verification.details}\n`;
  }

  if (result.evidence) {
    md += `\n> Evidence captured: Snapshot ${result.evidence.snapshotId}\n`;
  }

  if (result.data) {
    md += `\n**Data:**\n\`\`\`json\n${JSON.stringify(
      result.data,
      null,
      2,
    )}\n\`\`\`\n`;
  }

  if (evidenceHash) {
    md += `\n*Audit Hash: ${evidenceHash}*\n`;
  }

  return {
    llmContent: jsonContent,
    returnDisplay: md,
    error: success ? undefined : { message: result.message || 'Unknown error' },
    metadata: {
      evidenceHash,
      verification: result.verification,
    },
  };
}
