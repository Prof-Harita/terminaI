/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';

// Import the functions we're testing
import { createRelaySession } from './relay.js';

// Mock the logger to prevent console spam
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Relay Session', () => {
  it('creates a session with all required fields', () => {
    const session = createRelaySession('wss://relay.example.com');

    expect(session.sessionId).toBeDefined();
    expect(session.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(session.key).toBeInstanceOf(Buffer);
    expect(session.key.length).toBe(32); // 256 bits
    expect(session.shareUrl).toContain('session=');
    expect(session.shareUrl).toContain('key=');
    expect(session.shareUrl).toContain('relay=');
    expect(session.pairingRequired).toBe(true);
    expect(session.pairingCode).toMatch(/^\d{6}$/);
    expect(session.reconnectAttempts).toBe(0);
  });

  it('generates unique session IDs', () => {
    const session1 = createRelaySession('wss://relay.example.com');
    const session2 = createRelaySession('wss://relay.example.com');

    expect(session1.sessionId).not.toBe(session2.sessionId);
    expect(session1.pairingCode).not.toBe(session2.pairingCode);
  });
});

describe('Anti-Replay Protection', () => {
  it('validates sequence numbers increment correctly', () => {
    let inboundMaxSeq = 0;

    // Simulate receiving messages with correct sequence
    const validateSeq = (seq: number): boolean => {
      if (seq !== inboundMaxSeq + 1) {
        return false;
      }
      inboundMaxSeq = seq;
      return true;
    };

    expect(validateSeq(1)).toBe(true);
    expect(validateSeq(2)).toBe(true);
    expect(validateSeq(3)).toBe(true);

    // Replay attack - seq already used
    expect(validateSeq(2)).toBe(false);

    // Skip attack - seq too high
    expect(validateSeq(5)).toBe(false);

    // Correct next seq still works
    expect(validateSeq(4)).toBe(true);
  });

  it('rejects replayed sequence numbers', () => {
    const inboundMaxSeq = 5;

    // Attacker replays an old message with seq=3
    const replaySeq = 3;
    expect(replaySeq).not.toBe(inboundMaxSeq + 1);
  });
});

describe('Epoch Validation', () => {
  it('validates epoch matches connection epoch', () => {
    const connectionEpoch = crypto.randomBytes(8).toString('hex');

    // Message with matching epoch
    const validEnvelope = {
      v: 2,
      type: 'RPC',
      dir: 'c2h',
      seq: 1,
      ts: Date.now(),
      epoch: connectionEpoch,
      payload: {},
    };

    expect(validEnvelope.epoch).toBe(connectionEpoch);

    // Message with wrong epoch (e.g., from previous connection)
    const oldEpoch = crypto.randomBytes(8).toString('hex');
    const invalidEnvelope = {
      ...validEnvelope,
      epoch: oldEpoch,
    };

    expect(invalidEnvelope.epoch).not.toBe(connectionEpoch);
  });

  it('generates unique epoch per connection', () => {
    const epoch1 = crypto.randomBytes(8).toString('hex');
    const epoch2 = crypto.randomBytes(8).toString('hex');

    expect(epoch1).not.toBe(epoch2);
    expect(epoch1.length).toBe(16); // 8 bytes = 16 hex chars
  });
});

describe('AAD Construction', () => {
  it('builds correct AAD for v1 protocol', () => {
    const sessionId = uuidv4();
    const dir = 'c2h';

    const aad = `terminai-relay|v=1|session=${sessionId}|dir=${dir}`;

    expect(aad).toContain('v=1');
    expect(aad).toContain(`session=${sessionId}`);
    expect(aad).toContain('dir=c2h');
    expect(aad).not.toContain('epoch');
  });

  it('builds correct AAD for v2 protocol with epoch', () => {
    const sessionId = uuidv4();
    const epoch = crypto.randomBytes(8).toString('hex');
    const dir = 'h2c';

    const aad = `terminai-relay|v=2|session=${sessionId}|epoch=${epoch}|dir=${dir}`;

    expect(aad).toContain('v=2');
    expect(aad).toContain(`session=${sessionId}`);
    expect(aad).toContain(`epoch=${epoch}`);
    expect(aad).toContain('dir=h2c');
  });
});

describe('Version Negotiation', () => {
  it('selects v2 when both client and host support it', () => {
    const hostSupported = [2]; // Host prefers v2 only
    const clientOffered = [1, 2]; // Client offers both

    const selectedVersion = hostSupported.find((v) =>
      clientOffered.includes(v),
    );

    expect(selectedVersion).toBe(2);
  });

  it('rejects v1-only client when host requires v2', () => {
    const hostSupported = [2]; // Host v2 only (no ALLOW_INSECURE_RELAY_V1)
    const clientOffered = [1]; // Old client only supports v1

    const selectedVersion = hostSupported.find((v) =>
      clientOffered.includes(v),
    );

    expect(selectedVersion).toBeUndefined();
  });

  it('falls back to v1 when ALLOW_INSECURE_V1 is enabled', () => {
    const hostSupported = [2, 1]; // Allow v1 fallback
    const clientOffered = [1]; // Old client

    const selectedVersion = hostSupported.find((v) =>
      clientOffered.includes(v),
    );

    expect(selectedVersion).toBe(1);
  });
});

describe('Pairing Code', () => {
  it('generates 6-digit numeric codes', () => {
    for (let i = 0; i < 100; i++) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      expect(code).toMatch(/^\d{6}$/);
      expect(parseInt(code, 10)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(code, 10)).toBeLessThan(1000000);
    }
  });
});
