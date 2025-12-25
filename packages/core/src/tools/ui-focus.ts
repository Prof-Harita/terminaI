/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiFocusSchema } from '../gui/protocol/schemas.js';
import type { UiFocusArgs } from '../gui/protocol/schemas.js';
import type { ToolResult, ToolInvocation } from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_FOCUS_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';

class UiFocusToolInvocation extends BaseToolInvocation<
  UiFocusArgs,
  ToolResult
> {
  constructor(
    params: UiFocusArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Focus on: ${this.params.target}`;
  }

  async execute(): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const result = await svc.focus(this.params);
    return formatUiResult(result, 'UiFocus');
  }
}

export class UiFocusTool extends UiToolBase<UiFocusArgs> {
  constructor(messageBus?: MessageBus) {
    super(
      UI_FOCUS_TOOL_NAME,
      'UI Focus',
      'Focus an element.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          target: { type: 'string' },
          verify: { type: 'boolean' },
        },
        required: ['target'],
      },
      true,
      false,
      messageBus,
    );
  }

  override validateToolParams(params: UiFocusArgs): string | null {
    const res = UiFocusSchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiFocusArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiFocusArgs, ToolResult> {
    return new UiFocusToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
