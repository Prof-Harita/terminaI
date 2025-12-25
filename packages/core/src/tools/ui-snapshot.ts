/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiSnapshotSchema } from '../gui/protocol/schemas.js';
import type { UiSnapshotArgs } from '../gui/protocol/schemas.js';
import type { ToolResult, ToolInvocation } from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_SNAPSHOT_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';

class UiSnapshotToolInvocation extends BaseToolInvocation<
  UiSnapshotArgs,
  ToolResult
> {
  constructor(
    params: UiSnapshotArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Capturing UI snapshot (scope=${this.params.scope || 'screen'})`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const snap = await svc.snapshot(this.params);
    const result = {
      status: 'success' as const,
      driver: snap.driver,
      evidence: { snapshotId: 'current' },
      data: snap,
    };
    return formatUiResult(result, 'UiSnapshot');
  }
}

export class UiSnapshotTool extends UiToolBase<UiSnapshotArgs> {
  constructor(messageBus?: MessageBus) {
    super(
      UI_SNAPSHOT_TOOL_NAME,
      'UI Snapshot',
      'Capture the current UI state as a structured tree (VisualDOM) and optional screenshot.',
      Kind.Read,
      {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['screen', 'window'],
            description: 'Scope of capture',
          },
          includeTree: {
            type: 'boolean',
            description: 'Include the accessibility tree',
          },
          includeScreenshot: {
            type: 'boolean',
            description: 'Include screenshot hash (if policy allows)',
          },
          includeTextIndex: {
            type: 'boolean',
            description: 'Include text positions',
          },
          maxDepth: { type: 'number', description: 'Limit tree depth' },
        },
      },
      true,
      false,
      messageBus,
    );
  }

  // Override validation to use Zod
  override validateToolParams(params: UiSnapshotArgs): string | null {
    const res = UiSnapshotSchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null; // Zod passes
  }

  protected createInvocation(
    params: UiSnapshotArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiSnapshotArgs, ToolResult> {
    return new UiSnapshotToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
