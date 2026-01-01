/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiWaitSchema } from '../gui/protocol/schemas.js';
import type { UiWaitArgs } from '../gui/protocol/schemas.js';
import type { ToolResult, ToolInvocation } from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_WAIT_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';
import type { Config } from '../config/config.js';

class UiWaitToolInvocation extends BaseToolInvocation<UiWaitArgs, ToolResult> {
  constructor(
    params: UiWaitArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Waiting for ${this.params.selector} to be ${this.params.state || 'visible'}`;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const result = await svc.waitFor(this.params, signal);
    return formatUiResult(result, 'UiWait');
  }
}

export class UiWaitTool extends UiToolBase<UiWaitArgs> {
  constructor(config: Config, messageBus?: MessageBus) {
    super(
      UI_WAIT_TOOL_NAME,
      'UI Wait',
      'Wait for a condition (e.g. element visible).',
      Kind.Read,
      {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          state: {
            type: 'string',
            enum: ['visible', 'hidden', 'exists', 'removed'],
          },
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

  override validateToolParams(params: UiWaitArgs): string | null {
    const res = UiWaitSchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiWaitArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiWaitArgs, ToolResult> {
    return new UiWaitToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
