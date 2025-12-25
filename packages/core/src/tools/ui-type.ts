/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiTypeSchema } from '../gui/protocol/schemas.js';
import type { UiTypeArgs } from '../gui/protocol/schemas.js';
import type { ToolResult, ToolInvocation } from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_TYPE_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';

class UiTypeToolInvocation extends BaseToolInvocation<UiTypeArgs, ToolResult> {
  constructor(
    params: UiTypeArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Type text "${
      this.params.redactInLogs ? '***' : this.params.text
    }" into target: ${this.params.target || 'focused element'}`;
  }

  async execute(): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const result = await svc.type(this.params);
    return formatUiResult(result, 'UiType');
  }
}

export class UiTypeTool extends UiToolBase<UiTypeArgs> {
  constructor(messageBus?: MessageBus) {
    super(
      UI_TYPE_TOOL_NAME,
      'UI Type',
      'Type text into an element.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          text: { type: 'string' },
          target: { type: 'string' },
          mode: { type: 'string', enum: ['insert', 'replace', 'append'] },
          redactInLogs: { type: 'boolean' },
          verify: { type: 'boolean' },
        },
        required: ['text'],
      },
      true,
      false,
      messageBus,
    );
  }

  override validateToolParams(params: UiTypeArgs): string | null {
    const res = UiTypeSchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiTypeArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiTypeArgs, ToolResult> {
    return new UiTypeToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
