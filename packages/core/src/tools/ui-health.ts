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
import { UI_HEALTH_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';
import type { Config } from '../config/config.js';

type UiHealthArgs = Record<string, never>;

class UiHealthToolInvocation extends BaseToolInvocation<
  UiHealthArgs,
  ToolResult
> {
  constructor(
    params: UiHealthArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Checking driver health`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();

    try {
      // Use diagnose for deep health check
      const report = await svc.diagnose();

      if (!report.connection.connected) {
        throw new Error(report.connection.error || 'Driver disconnected');
      }

      const hasWarnings = report.warnings.length > 0;
      // const status = hasWarnings ? 'mixed' : 'success';
      // Actually protocol says status: 'success' | 'error'.

      let message = 'Driver is healthy and connected.';
      if (hasWarnings) {
        message = `Driver connected but has warnings: ${report.warnings.join('; ')}`;
      }

      // Readiness Audit Log
      console.info(
        `[UI:Readiness] Health check: ${hasWarnings ? 'degraded' : 'healthy'}, warnings: ${report.warnings.length}`,
      );

      return formatUiResult(
        {
          status: 'success',
          driver: report.driver,
          message,
          data: {
            health: hasWarnings ? 'degraded' : 'healthy',
            ...report.driver,
            warnings: report.warnings,
          },
        },
        'UiHealth',
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
          message: `Driver unhealthy: ${String(e)}`,
        },
        'UiHealth',
      );
    }
  }
}

export class UiHealthTool extends UiToolBase<UiHealthArgs> {
  constructor(config: Config, messageBus?: MessageBus) {
    super(
      UI_HEALTH_TOOL_NAME,
      'UI Health',
      'Check if the GUI automation driver is installed and healthy.',
      Kind.Read,
      {
        type: 'object',
        properties: {},
      },
      true,
      false,
      config,
      messageBus,
    );
  }

  override validateToolParams(_params: UiHealthArgs): string | null {
    return null;
  }

  protected createInvocation(
    params: UiHealthArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiHealthArgs, ToolResult> {
    return new UiHealthToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
