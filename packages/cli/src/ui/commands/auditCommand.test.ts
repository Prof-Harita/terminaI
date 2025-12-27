/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { auditCommand } from './auditCommand.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import { MessageType } from '../types.js';
import type { AuditLedger } from '@terminai/core';

describe('auditCommand', () => {
  it('shows error when ledger unavailable', async () => {
    const ctx = createMockCommandContext();
    if (!auditCommand.action) throw new Error('No action');
    await auditCommand.action(ctx, '');
    expect(ctx.ui.addItem).toHaveBeenCalledWith(
      {
        type: MessageType.ERROR,
        text: 'Audit ledger is unavailable.',
      },
      expect.any(Number),
    );
  });

  it('shows recent events', async () => {
    const ledger: AuditLedger = {
      append: vi.fn(),
      query: vi.fn().mockResolvedValue([
        {
          timestamp: '2025-01-01T00:00:00Z',
          eventType: 'tool.requested',
          sessionId: 's',
          provenance: ['local_user'],
          version: 1,
        },
      ]),
      verifyHashChain: vi.fn(),
      export: vi.fn(),
    };

    const ctx = createMockCommandContext({
      services: {
        config: {
          getAuditLedger: () => ledger,
        } as unknown as any,
      },
    });

    if (!auditCommand.action) throw new Error('No action');
    await auditCommand.action(ctx, '');

    expect(ctx.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.INFO }),
      expect.any(Number),
    );
  });

  it('verifies hash chain', async () => {
    const ledger: AuditLedger = {
      append: vi.fn(),
      query: vi.fn(),
      verifyHashChain: vi.fn().mockResolvedValue({ ok: true }),
      export: vi.fn(),
    };
    const verifyCmd = auditCommand.subCommands?.find(
      (c) => c.name === 'verify',
    );
    if (!verifyCmd || !verifyCmd.action) throw new Error('verify missing');

    const ctx = createMockCommandContext({
      services: { config: { getAuditLedger: () => ledger } as unknown as any },
    });

    await verifyCmd.action(ctx, '');
    expect(ctx.ui.addItem).toHaveBeenCalledWith(
      {
        type: MessageType.SUCCESS,
        text: 'Audit hash chain verified (OK).',
      },
      expect.any(Number),
    );
  });

  it('exports audit log', async () => {
    const ledger: AuditLedger = {
      append: vi.fn(),
      query: vi.fn(),
      verifyHashChain: vi.fn(),
      export: vi.fn().mockResolvedValue('exported'),
    };
    const exportCmd = auditCommand.subCommands?.find(
      (c) => c.name === 'export',
    );
    if (!exportCmd || !exportCmd.action) throw new Error('export missing');

    const ctx = createMockCommandContext({
      services: {
        config: {
          getAuditLedger: () => ledger,
          getAuditSettings: () => ({
            exportFormat: 'jsonl',
            exportRedaction: 'enterprise',
          }),
        } as unknown as any,
      },
    });

    await exportCmd.action(ctx, '');
    expect(ledger.export).toHaveBeenCalledWith({
      format: 'jsonl',
      redaction: 'enterprise',
    });
    expect(ctx.ui.addItem).toHaveBeenCalledWith(
      {
        type: MessageType.INFO,
        text: 'exported',
      },
      expect.any(Number),
    );
  });
});
