/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AuditEvent, AuditLedger } from '@terminai/core';
import { CommandKind, type SlashCommand } from './types.js';
import { MessageType } from '../types.js';

function getLedger(
  context: Parameters<NonNullable<SlashCommand['action']>>[0],
): AuditLedger | null {
  const config = context.services.config;
  if (!config || typeof config.getAuditLedger !== 'function') {
    return null;
  }
  return config.getAuditLedger();
}

function formatEvents(events: AuditEvent[]): string {
  if (events.length === 0) {
    return 'No audit events recorded yet.';
  }
  return events
    .map((event) => {
      const tool = event.tool?.toolName ? ` (${event.tool?.toolName})` : '';
      const level = event.reviewLevel ? ` [${event.reviewLevel}]` : '';
      return `${event.timestamp} - ${event.eventType}${tool}${level}`;
    })
    .join('\n');
}

export const auditCommand: SlashCommand = {
  name: 'audit',
  description:
    'View or export audit ledger (always on). Usage: /audit [export|verify]',
  kind: CommandKind.BUILT_IN,
  hidden: true, // Aliased by /logs - kept for upstream compatibility
  autoExecute: false,
  action: async (context) => {
    const ledger = getLedger(context);
    if (!ledger) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Audit ledger is unavailable.',
        },
        Date.now(),
      );
      return;
    }

    const events = await ledger.query({ limit: 10 });
    context.ui.addItem(
      {
        type: MessageType.INFO,
        text: formatEvents(events),
      },
      Date.now(),
    );
  },
  subCommands: [
    {
      name: 'verify',
      description: 'Verify the audit hash chain',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const ledger = getLedger(context);
        if (!ledger) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Audit ledger is unavailable.',
            },
            Date.now(),
          );
          return;
        }
        const result = await ledger.verifyHashChain();
        context.ui.addItem(
          {
            type: result.ok ? MessageType.INFO : MessageType.ERROR,
            text: result.ok
              ? 'Audit hash chain verified (OK).'
              : `Audit verification failed: ${result.error ?? 'unknown error'}`,
          },
          Date.now(),
        );
      },
    },
    {
      name: 'export',
      description: 'Export audit log with current redaction settings',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const ledger = getLedger(context);
        if (!ledger) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Audit ledger is unavailable.',
            },
            Date.now(),
          );
          return;
        }
        const auditSettings =
          context.services.config?.getAuditSettings?.() ?? {};
        const exportText = await ledger.export({
          format: auditSettings.exportFormat ?? 'jsonl',
          redaction: auditSettings.exportRedaction ?? 'enterprise',
        });
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: exportText,
          },
          Date.now(),
        );
      },
    },
  ],
};
