/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiKeySchema } from '../gui/protocol/schemas.js';
import type { UiKeyArgs } from '../gui/protocol/schemas.js';
import type {
  ToolCallConfirmationDetails,
  ToolInvocation,
  ToolResult,
} from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_KEY_TOOL_NAME } from './tool-names.js';
import { buildUiConfirmationDetails, formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';

class UiKeyToolInvocation extends BaseToolInvocation<UiKeyArgs, ToolResult> {
  constructor(
    params: UiKeyArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Press keys: ${JSON.stringify(this.params.keys)}`;
  }

  protected override async getConfirmationDetails(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    return buildUiConfirmationDetails({
      toolName: this._toolName ?? UI_KEY_TOOL_NAME,
      description: this.getDescription(),
      provenance: this.getProvenance(),
      title: 'Confirm UI Key',
      onConfirm: async (outcome) => {
        await this.publishPolicyUpdate(outcome);
      },
    });
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const result = await svc.key(this.params);
    return formatUiResult(result, 'UiKey');
  }
}

export class UiKeyTool extends UiToolBase<UiKeyArgs> {
  constructor(messageBus?: MessageBus) {
    super(
      UI_KEY_TOOL_NAME,
      'UI Key',
      'Press a sequence of keys (e.g. ["Control", "c"]).',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          keys: { type: 'array', items: { type: 'string' } },
          target: {
            type: 'string',
            description: 'Optional target to focus first',
          },
          verify: { type: 'boolean' },
        },
        required: ['keys'],
      },
      true,
      false,
      messageBus,
    );
  }

  override validateToolParams(params: UiKeyArgs): string | null {
    const res = UiKeySchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiKeyArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiKeyArgs, ToolResult> {
    return new UiKeyToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
