/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseDeclarativeTool } from './tools.js';
import type { ToolResult } from './tools.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';
import type { UiActionResult } from '../gui/protocol/types.js';

export abstract class UiToolBase<
  TParams extends object,
> extends BaseDeclarativeTool<TParams, ToolResult> {
  protected get service() {
    return DesktopAutomationService.getInstance();
  }

  protected formatResult(result: UiActionResult, toolName: string): ToolResult {
    const success = result.status === 'success';

    // Construct LLM Content (JSON)
    const jsonContent = JSON.stringify(result, null, 2);

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

    return {
      llmContent: { text: jsonContent }, // Using text part for JSON
      returnDisplay: md,
      error: success
        ? undefined
        : { message: result.message || 'Unknown error' },
    };
  }
}
