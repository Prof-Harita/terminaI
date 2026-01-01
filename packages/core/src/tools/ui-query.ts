/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiQuerySchema } from '../gui/protocol/schemas.js';
import type { UiQueryArgs } from '../gui/protocol/schemas.js';
import type { ToolResult, ToolInvocation } from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_QUERY_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';
import type { Config } from '../config/config.js';

class UiQueryToolInvocation extends BaseToolInvocation<
  UiQueryArgs,
  ToolResult
> {
  constructor(
    params: UiQueryArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Querying UI elements: ${this.params.selector}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const result = await svc.query(this.params);
    return formatUiResult(result, 'UiQuery');
  }
}

export class UiQueryTool extends UiToolBase<UiQueryArgs> {
  constructor(config: Config, messageBus?: MessageBus) {
    super(
      UI_QUERY_TOOL_NAME,
      'UI Query',
      'Find elements matching a selector without acting on them.',
      Kind.Read,
      {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          limit: { type: 'number' },
          timeoutMs: { type: 'number' },
        },
        required: ['selector'],
      },
      true,
      false,
      config,
      messageBus,
    );
  }

  override validateToolParams(params: UiQueryArgs): string | null {
    const res = UiQuerySchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiQueryArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiQueryArgs, ToolResult> {
    return new UiQueryToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
