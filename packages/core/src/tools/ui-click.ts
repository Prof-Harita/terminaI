/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiClickSchema } from '../gui/protocol/schemas.js';
import type { UiClickArgs } from '../gui/protocol/schemas.js';
import type {
  ToolCallConfirmationDetails,
  ToolInvocation,
  ToolResult,
} from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_CLICK_TOOL_NAME } from './tool-names.js';
import {
  buildUiConfirmationDetails,
  formatUiResult,
} from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';

class UiClickToolInvocation extends BaseToolInvocation<
  UiClickArgs,
  ToolResult
> {
  constructor(
    params: UiClickArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Click on target: ${this.params.target}`;
  }

  protected override async getConfirmationDetails(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    return buildUiConfirmationDetails({
      toolName: this._toolName ?? UI_CLICK_TOOL_NAME,
      description: this.getDescription(),
      provenance: this.getProvenance(),
      title: 'Confirm UI Click',
      onConfirm: async (outcome) => {
        await this.publishPolicyUpdate(outcome);
      },
    });
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const result = await svc.click(this.params);
    return formatUiResult(result, 'UiClick');
  }
}

export class UiClickTool extends UiToolBase<UiClickArgs> {
  constructor(messageBus?: MessageBus) {
    super(
      UI_CLICK_TOOL_NAME,
      'UI Click',
      'Click an element identified by a selector.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Selector string' },
          button: { type: 'string', enum: ['left', 'right', 'middle'] },
          clickCount: { type: 'number' },
          modifiers: { type: 'array', items: { type: 'string' } },
          verify: { type: 'boolean' },
        },
        required: ['target'],
      },
      true,
      false,
      messageBus,
    );
  }

  override validateToolParams(params: UiClickArgs): string | null {
    const res = UiClickSchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiClickArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiClickArgs, ToolResult> {
    return new UiClickToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
