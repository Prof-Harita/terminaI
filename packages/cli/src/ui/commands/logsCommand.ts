/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The /logs command is the canonical user-facing command for viewing session logs.
 * It wraps the internal /audit command with a more intuitive, operator-friendly name.
 *
 * Default action (no subcommand): Show recent log entries.
 */

import type { AuditEvent, AuditLedger } from '@terminai/core';
import { CommandKind, type SlashCommand } from './types.js';
import { CommandCategory } from './categories.js';
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
    return 'No log entries recorded yet.';
  }
  return events
    .map((event) => {
      const tool = event.tool?.toolName ? ` (${event.tool?.toolName})` : '';
      const level = event.reviewLevel ? ` [${event.reviewLevel}]` : '';
      return `${event.timestamp} - ${event.eventType}${tool}${level}`;
    })
    .join('\n');
}

const showSubcommand: SlashCommand = {
  name: 'show',
  description: 'Show recent log entries (default)',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: async (context) => {
    const ledger = getLedger(context);
    if (!ledger) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Log ledger is unavailable.',
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
};

const verifySubcommand: SlashCommand = {
  name: 'verify',
  description: 'Verify the log hash chain integrity',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: async (context) => {
    const ledger = getLedger(context);
    if (!ledger) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Log ledger is unavailable.',
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
          ? 'Log hash chain verified (OK).'
          : `Log verification failed: ${result.error ?? 'unknown error'}`,
      },
      Date.now(),
    );
  },
};

const exportSubcommand: SlashCommand = {
  name: 'export',
  description: 'Export logs with current redaction settings',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: async (context) => {
    const ledger = getLedger(context);
    if (!ledger) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Log ledger is unavailable.',
        },
        Date.now(),
      );
      return;
    }
    const auditSettings = context.services.config?.getAuditSettings?.() ?? {};
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
};

export const logsCommand: SlashCommand = {
  name: 'logs',
  description: 'View or export session logs. Usage: /logs [show|verify|export]',
  kind: CommandKind.BUILT_IN,
  visibility: 'core',
  category: CommandCategory.SYSTEM_OPERATOR,
  altNames: ['audit'], // Backwards compatibility alias
  subCommands: [showSubcommand, verifySubcommand, exportSubcommand],
  // Default action: show recent logs
  action: (context, args) => showSubcommand.action!(context, args),
};
