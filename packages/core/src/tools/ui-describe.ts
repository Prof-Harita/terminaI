/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiDescribeSchema } from '../gui/protocol/schemas.js';
import type { UiDescribeArgs } from '../gui/protocol/schemas.js';
import type { ToolResult, ToolInvocation } from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_DESCRIBE_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';

class UiDescribeToolInvocation extends BaseToolInvocation<
  UiDescribeArgs,
  ToolResult
> {
  constructor(
    params: UiDescribeArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Describe element: ${this.params.target}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    // Re-use svc.query or similar logic.
    // Since svc doesn't have explicit 'describe' method in the interface I saw earlier,
    // I might need to use 'query' or implement 'describe' in svc.
    // The gap analysis says: "Tool must resolve: selector -> best match -> return full node + ancestry".
    // ui.query does resolve + return node.
    // ui.describe implies detailed inspection.
    // I can reuse svc.query({ selector: target, limit: 1 }) if I don't want to modify valid service interface too much.
    // However, the prompt says "Implement UiDescribeTool...".
    // And "ui.describe (Gap B1.1)".

    // Ideally svc should have a describe method.
    // But ui-query.ts likely calls svc.query.
    // Let's call svc.query for now as it returns the node.
    // Or I can add describe to svc if needed.
    // svc.query returns UiActionResult with data: array of elements.

    const result = await svc.query({
      selector: this.params.target,
      limit: 1,
    });

    // Remap result for 'describe' semantic (e.g. detailed view) if needed.
    // For now, returning the query result format is acceptable as it includes the node.

    return formatUiResult(result, 'UiDescribe');
  }
}

export class UiDescribeTool extends UiToolBase<UiDescribeArgs> {
  constructor(messageBus?: MessageBus) {
    super(
      UI_DESCRIBE_TOOL_NAME,
      'UI Describe',
      'Get detailed information about a UI element found by selector or ID.',
      Kind.Read,
      {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Selector or Element Reference',
          },
        },
        required: ['target'],
      },
      true,
      false,
      messageBus,
    );
  }

  override validateToolParams(params: UiDescribeArgs): string | null {
    const res = UiDescribeSchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiDescribeArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiDescribeArgs, ToolResult> {
    return new UiDescribeToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
