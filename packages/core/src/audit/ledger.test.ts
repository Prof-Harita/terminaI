/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FileAuditLedger } from './ledger.js';
import type { AuditEvent } from './schema.js';

describe('FileAuditLedger', () => {
  let tempDir: string;
  let ledgerPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-ledger-'));
    ledgerPath = path.join(tempDir, 'audit.jsonl');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const baseEvent: AuditEvent = {
    version: 1,
    eventType: 'tool.requested',
    timestamp: new Date().toISOString(),
    sessionId: 'session-1',
    provenance: ['local_user'],
    tool: {
      callId: 'call-1',
      toolName: 'demo',
    },
  };

  it('writes events with hash chain and verifies', async () => {
    const ledger = new FileAuditLedger(ledgerPath, {
      redactUiTypedText: true,
    });

    await ledger.append(baseEvent);
    await ledger.append({
      ...baseEvent,
      eventType: 'tool.execution_finished',
      tool: { ...baseEvent.tool, result: { success: true } },
    });

    const events = await ledger.query({ limit: 10 });
    expect(events).toHaveLength(2);
    expect(events[0].hash).toBeDefined();
    expect(events[1].prevHash).toBe(events[0].hash);

    const verify = await ledger.verifyHashChain();
    expect(verify.ok).toBe(true);
  });

  it('redacts secrets and ui typed text', async () => {
    const ledger = new FileAuditLedger(ledgerPath, {
      redactUiTypedText: true,
    });

    await ledger.append({
      ...baseEvent,
      tool: {
        callId: 'call-2',
        toolName: 'ui.type',
        args: { text: 'supersecret token' },
      },
    });

    const events = await ledger.query({ limit: 1 });
    expect(events[0].tool?.args).not.toEqual(baseEvent.tool?.args);
    expect(events[0].redactions?.length).toBeGreaterThan(0);
  });
});
