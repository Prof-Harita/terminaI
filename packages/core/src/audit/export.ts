/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AuditEvent } from './schema.js';

export type AuditExportFormat = 'jsonl' | 'json';
export type AuditExportRedaction = 'enterprise' | 'debug';

export function applyExportRedaction(
  events: AuditEvent[],
  redaction: AuditExportRedaction,
): AuditEvent[] {
  if (redaction === 'debug') {
    return events;
  }

  // Enterprise export keeps metadata but removes detailed args/results.
  return events.map((event) => ({
    ...event,
    tool: event.tool
      ? {
          callId: event.tool.callId,
          toolName: event.tool.toolName,
          toolKind: event.tool.toolKind,
          args: undefined,
          result: event.tool.result
            ? {
                ...event.tool.result,
                metadata: undefined,
              }
            : undefined,
        }
      : undefined,
  }));
}
