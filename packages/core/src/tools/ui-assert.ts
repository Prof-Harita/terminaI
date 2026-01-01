/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiAssertSchema } from '../gui/protocol/schemas.js';
import type { UiAssertArgs } from '../gui/protocol/schemas.js';
import type { ToolResult, ToolInvocation } from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_ASSERT_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';
import type { Config } from '../config/config.js';

class UiAssertToolInvocation extends BaseToolInvocation<
  UiAssertArgs,
  ToolResult
> {
  constructor(
    params: UiAssertArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Asserting: ${this.params.assertion} on ${this.params.target}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const result = await svc.assert(this.params);
    return formatUiResult(result, 'UiAssert');
  }
}

export class UiAssertTool extends UiToolBase<UiAssertArgs> {
  constructor(config: Config, messageBus?: MessageBus) {
    super(
      UI_ASSERT_TOOL_NAME,
      'UI Assert',
      'Assert a condition on the UI state.',
      Kind.Read,
      {
        type: 'object',
        properties: {
          target: { type: 'string' },
          assertion: {
            type: 'string',
            enum: ['exists', 'not_exists', 'contains_text', 'equals_text'],
          },
          value: { type: 'string' },
        },
        required: ['target', 'assertion'],
      },
      true,
      false,
      config,
      messageBus,
    );
  }

  override validateToolParams(params: UiAssertArgs): string | null {
    const res = UiAssertSchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiAssertArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiAssertArgs, ToolResult> {
    return new UiAssertToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
