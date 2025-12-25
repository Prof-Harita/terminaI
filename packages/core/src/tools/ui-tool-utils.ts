/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'node:crypto';
import type { UiActionResult } from '../gui/protocol/types.js';
import type { ToolResult } from './tools.js';

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
    llmContent: { text: jsonContent },
    returnDisplay: md,
    error: success ? undefined : { message: result.message || 'Unknown error' },
    metadata: {
      evidenceHash,
      verification: result.verification,
    },
  };
}
