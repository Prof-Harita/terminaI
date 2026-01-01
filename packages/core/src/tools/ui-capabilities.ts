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
import { UI_CAPABILITIES_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';
import type { Config } from '../config/config.js';

type UiCapabilitiesArgs = Record<string, never>;

class UiCapabilitiesToolInvocation extends BaseToolInvocation<
  UiCapabilitiesArgs,
  ToolResult
> {
  constructor(
    params: UiCapabilitiesArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Checking driver capabilities`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const descriptor = await svc.getDriverDescriptor();
    return formatUiResult(
      {
        status: 'success',
        driver: descriptor,
        data: { capabilities: descriptor.capabilities },
      },
      'UiCapabilities',
    );
  }
}

export class UiCapabilitiesTool extends UiToolBase<UiCapabilitiesArgs> {
  constructor(config: Config, messageBus?: MessageBus) {
    super(
      UI_CAPABILITIES_TOOL_NAME,
      'UI Capabilities',
      'Check what actions are supported by the current driver.',
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

  override validateToolParams(_params: UiCapabilitiesArgs): string | null {
    return null;
  }

  protected createInvocation(
    params: UiCapabilitiesArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiCapabilitiesArgs, ToolResult> {
    return new UiCapabilitiesToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
