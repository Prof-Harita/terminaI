/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import type { ToolResult, ToolInvocation } from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_DIAGNOSE_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';
import type { Config } from '../config/config.js';
import type { UiDiagnoseArgs } from '../gui/protocol/schemas.js';

class UiDiagnoseToolInvocation extends BaseToolInvocation<
  UiDiagnoseArgs,
  ToolResult
> {
  constructor(
    params: UiDiagnoseArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Running UI diagnostics to check system health`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();

    try {
      const report = await svc.diagnose(this.params);

      // Return success unless specifically critical error?
      // Actually diagnose always returns a report, even if unhealthy.
      // So we return 'success' tool status, but the report might contain errors.

      // Readiness Audit Log
      console.info(
        `[UI:Readiness] Diagnose: connected=${report.connection.connected}, warnings=${report.warnings.length}`,
      );

      return formatUiResult(
        {
          status: 'success',
          driver: report.driver,
          message: `Diagnostics complete. ${report.warnings.length} warnings.`,
          data: report,
        },
        'UiDiagnose',
      );
    } catch (e) {
      return formatUiResult(
        {
          status: 'error',
          driver: {
            name: 'unknown',
            kind: 'mock',
            version: '0.0.0',
            capabilities: {
              canSnapshot: false,
              canClick: false,
              canType: false,
              canScroll: false,
              canKey: false,
              canOcr: false,
              canScreenshot: false,
              canInjectInput: false,
            },
          },
          message: `Diagnostics failed: ${String(e)}`,
        },
        'UiDiagnose',
      );
    }
  }
}

export class UiDiagnoseTool extends UiToolBase<UiDiagnoseArgs> {
  constructor(config: Config, messageBus?: MessageBus) {
    super(
      UI_DIAGNOSE_TOOL_NAME,
      'UI Diagnose',
      'Run a diagnostic check on the GUI automation system, returning capability, connectivity status, and a sanity check of the accessibility tree.',
      Kind.Read,
      {
        type: 'object',
        properties: {
          depth: {
            type: 'integer',
            description: 'Max depth for sanity snapshot (default 3)',
          },
          sampleLimit: {
            type: 'integer',
            description: 'Max nodes for sanity snapshot (default 300)',
          },
          timeoutMs: {
            type: 'integer',
            description: 'Timeout in milliseconds',
          },
        },
      },
      true,
      false,
      config,
      messageBus,
    );
  }

  override validateToolParams(_params: UiDiagnoseArgs): string | null {
    // Basic validation handled by Zod in service if we used it there,
    // but here we just pass through.
    return null;
  }

  protected createInvocation(
    params: UiDiagnoseArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiDiagnoseArgs, ToolResult> {
    return new UiDiagnoseToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
