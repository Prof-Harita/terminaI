/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { WebSocket } from 'ws';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { DefaultRequestHandler } from '@a2a-js/sdk/server';

// Protocol version constants
const PROTOCOL_VERSIONS = {
  V1: 1,
  V2: 2,
} as const;

// Allow v1 fallback via environment variable (for transitional deployments)
const ALLOW_INSECURE_V1 = process.env['ALLOW_INSECURE_RELAY_V1'] === 'true';

export type RelayEnvelope = {
  v: 1 | 2;
  type:
    | 'HELLO'
    | 'HELLO_ACK'
    | 'PAIR'
    | 'PAIR_ACK'
    | 'RPC'
    | 'EVENT'
    | 'ERROR'
    | 'PING'
    | 'PONG'
    | 'CLOSE';
  dir: 'c2h' | 'h2c';
  seq: number;
  ts: number;
  epoch?: string; // Required for v2
  payload: unknown;
};

// Legacy type alias for compatibility
export type RelayEnvelopeV1 = RelayEnvelope;

export interface RelaySession {
  sessionId: string;
  key: Buffer;
  shareUrl: string;
  reconnectAttempts: number;
  pairingRequired: boolean;
  pairingCode?: string;
}

// Connection state including epoch for v2
interface ConnectionState {
  inboundMaxSeq: number;
  outboundSeq: number;
  handshakeState: 'WAIT_HELLO' | 'READY';
  protocolVersion: 1 | 2;
  epoch: string; // New epoch per connection for anti-replay
}

export function createRelaySession(relayUrl: string): RelaySession {
  const sessionId = uuidv4();
  // Generate 256-bit key for AES-GCM
  const key = crypto.randomBytes(32);
  const keyBase64 = key.toString('base64');

  // Construct user-friendly URL (Key is in hash, so it's never sent to server)
  // Default published Web Client URL: https://terminai.org/remote
  const webClientUrl =
    process.env['GEMINI_WEB_CLIENT_URL'] || 'https://terminai.org/remote';
  const pairingRequired = true; // Always require pairing for security
  const pairingCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code

  const shareUrl = `${webClientUrl}#session=${sessionId}&key=${encodeURIComponent(keyBase64)}&relay=${encodeURIComponent(relayUrl)}`;

  const printUrl = process.env['PRINT_RELAY_URL'] === 'true';
  if (printUrl) {
    logger.info(`[Relay] Remote Access URL: ${shareUrl}`);
    logger.info(
      '[Relay] (Share this URL securely. The key is in the hash and never verified by the server)',
    );
  } else {
    logger.info(
      JSON.stringify({
        event: 'session_created',
        sessionIdHash: sessionId.slice(0, 8),
        pairingCodeRequired: pairingRequired,
        timestamp: Date.now(),
      }),
    );
  }
  logger.info(
    `[Relay] Pairing Code: ${pairingCode} (required for first connection)`,
  );

  return {
    sessionId,
    key,
    shareUrl,
    reconnectAttempts: 0,
    pairingRequired,
    pairingCode,
  };
}

export async function connectToRelay(
  relayUrl: string,
  requestHandler: DefaultRequestHandler,
) {
  const session = createRelaySession(relayUrl);
  return runRelayConnection(session, relayUrl, requestHandler);
}

/**
 * Build AAD string based on protocol version
 */
function buildAad(
  sessionId: string,
  dir: 'c2h' | 'h2c',
  version: 1 | 2,
  epoch?: string,
): string {
  if (version === 2 && epoch) {
    return `terminai-relay|v=2|session=${sessionId}|epoch=${epoch}|dir=${dir}`;
  }
  return `terminai-relay|v=1|session=${sessionId}|dir=${dir}`;
}

/**
 * Encrypt an envelope for sending to client
 */
function encryptEnvelope(
  envelope: RelayEnvelope,
  key: Buffer,
  sessionId: string,
  version: 1 | 2,
  epoch?: string,
): Buffer {
  const envelopeBuffer = Buffer.from(JSON.stringify(envelope), 'utf8');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const aad = buildAad(sessionId, 'h2c', version, epoch);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  let ciphertext = cipher.update(envelopeBuffer);
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]);
}

export async function runRelayConnection(
  session: RelaySession,
  relayUrl: string,
  requestHandler: DefaultRequestHandler,
) {
  // Create new connection state with fresh epoch
  const connState: ConnectionState = {
    inboundMaxSeq: 0,
    outboundSeq: 0,
    handshakeState: 'WAIT_HELLO',
    protocolVersion: 2, // Default to v2, will be negotiated in handshake
    epoch: crypto.randomBytes(8).toString('hex'), // New epoch per connection
  };

  logger.info(
    JSON.stringify({
      event: 'relay_connect_attempt',
      sessionIdHash: session.sessionId.slice(0, 8),
      epoch: connState.epoch.slice(0, 8),
      timestamp: Date.now(),
    }),
  );
  const ws = new WebSocket(
    `${relayUrl}?role=host&session=${session.sessionId}`,
  );

  ws.on('open', () => {
    logger.info(
      JSON.stringify({
        event: 'relay_connected',
        sessionIdHash: session.sessionId.slice(0, 8),
        timestamp: Date.now(),
      }),
    );
    session.reconnectAttempts = 0;
  });

  ws.on('message', async (data) => {
    try {
      // Handle relay control messages (unencrypted JSON strings)
      if (typeof data === 'string') {
        try {
          const ctrl = JSON.parse(data);
          if (ctrl.type === 'RELAY_STATUS') {
            logger.info(
              JSON.stringify({
                event: 'relay_status',
                status: ctrl.status,
                sessionIdHash: session.sessionId.slice(0, 8),
                timestamp: Date.now(),
              }),
            );
            // No action needed for now - client handles reconnect
          }
        } catch {
          // Not JSON, silently ignore
        }
        return;
      }

      // Encrypted messages must be Buffer
      if (!Buffer.isBuffer(data)) {
        return;
      }

      const iv = data.subarray(0, 12);
      const ciphertext = data.subarray(12);
      const tag = ciphertext.subarray(0, 16);
      const actualCiphertext = ciphertext.subarray(16);

      // For HELLO, we need to try both v1 and v2 AAD since we don't know client version yet
      let envelope: RelayEnvelope | undefined;
      let usedVersion: 1 | 2 = 2;

      // Try v2 AAD first (with epoch), then v1
      const aadV2 = buildAad(session.sessionId, 'c2h', 2, connState.epoch);
      const aadV1 = buildAad(session.sessionId, 'c2h', 1);

      for (const { aad, version } of [
        { aad: aadV2, version: 2 as const },
        { aad: aadV1, version: 1 as const },
      ]) {
        try {
          const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            session.key,
            iv,
          );
          decipher.setAAD(Buffer.from(aad, 'utf8'));
          decipher.setAuthTag(tag);
          let decrypted = decipher.update(actualCiphertext);
          decrypted = Buffer.concat([decrypted, decipher.final()]);
          envelope = JSON.parse(decrypted.toString('utf8'));
          usedVersion = version;
          break;
        } catch {
          // Try next AAD
          continue;
        }
      }

      if (!envelope) {
        logger.warn(
          JSON.stringify({
            event: 'decrypt_failed',
            sessionIdHash: session.sessionId.slice(0, 8),
            timestamp: Date.now(),
          }),
        );
        return;
      }

      // Validate envelope sequence
      if (
        envelope.dir !== 'c2h' ||
        envelope.seq !== connState.inboundMaxSeq + 1
      ) {
        logger.warn(
          JSON.stringify({
            event: 'invalid_envelope',
            reason:
              envelope.seq !== connState.inboundMaxSeq + 1
                ? 'seq_mismatch'
                : 'invalid_dir',
            expected: connState.inboundMaxSeq + 1,
            got: envelope.seq,
            sessionIdHash: session.sessionId.slice(0, 8),
            timestamp: Date.now(),
          }),
        );
        return;
      }
      connState.inboundMaxSeq = envelope.seq;

      if (envelope.type === 'HELLO') {
        // Version negotiation
        const clientProtocols = (envelope.payload as { protocols?: number[] })
          .protocols || [1];
        const supportedVersions = ALLOW_INSECURE_V1
          ? [PROTOCOL_VERSIONS.V2, PROTOCOL_VERSIONS.V1]
          : [PROTOCOL_VERSIONS.V2];

        const selectedVersion = supportedVersions.find((v) =>
          clientProtocols.includes(v),
        );

        if (!selectedVersion) {
          // Client too old, send error
          const errorEnvelope: RelayEnvelope = {
            v: usedVersion,
            type: 'ERROR',
            dir: 'h2c',
            seq: ++connState.outboundSeq,
            ts: Date.now(),
            payload: {
              code: 'VERSION_MISMATCH',
              message:
                'Client too old, update required. Server requires protocol v2.',
            },
          };
          const errorPayload = encryptEnvelope(
            errorEnvelope,
            session.key,
            session.sessionId,
            usedVersion,
            connState.epoch,
          );
          ws.send(errorPayload);
          ws.close(1002, 'Protocol version mismatch');
          return;
        }

        connState.protocolVersion = selectedVersion;
        connState.handshakeState = 'READY';

        const ackEnvelope: RelayEnvelope = {
          v: selectedVersion,
          type: 'HELLO_ACK',
          dir: 'h2c',
          seq: ++connState.outboundSeq,
          ts: Date.now(),
          epoch: selectedVersion === 2 ? connState.epoch : undefined,
          payload: {
            selectedVersion,
            requiresPairing: session.pairingRequired,
            ...(selectedVersion === 2 ? { epoch: connState.epoch } : {}),
          },
        };
        const ackPayload = encryptEnvelope(
          ackEnvelope,
          session.key,
          session.sessionId,
          selectedVersion,
          selectedVersion === 2 ? connState.epoch : undefined,
        );
        ws.send(ackPayload);

        logger.info(
          JSON.stringify({
            event: 'handshake_complete',
            protocolVersion: selectedVersion,
            sessionIdHash: session.sessionId.slice(0, 8),
            timestamp: Date.now(),
          }),
        );
        return;
      }

      if (connState.handshakeState !== 'READY') {
        logger.warn(
          JSON.stringify({
            event: 'message_before_handshake',
            sessionIdHash: session.sessionId.slice(0, 8),
            timestamp: Date.now(),
          }),
        );
        return;
      }

      // For v2, validate epoch in subsequent messages
      if (
        connState.protocolVersion === 2 &&
        envelope.epoch !== connState.epoch
      ) {
        logger.warn(
          JSON.stringify({
            event: 'epoch_mismatch',
            sessionIdHash: session.sessionId.slice(0, 8),
            timestamp: Date.now(),
          }),
        );
        return;
      }

      if (envelope.type === 'PAIR') {
        const code = (envelope.payload as { code: string }).code;
        const success = code === session.pairingCode;

        if (success) {
          session.pairingRequired = false;
          logger.info(
            JSON.stringify({
              event: 'pairing_success',
              sessionIdHash: session.sessionId.slice(0, 8),
              timestamp: Date.now(),
            }),
          );
        } else {
          logger.warn(
            JSON.stringify({
              event: 'pairing_failure',
              sessionIdHash: session.sessionId.slice(0, 8),
              timestamp: Date.now(),
            }),
          );
        }

        // Send pairing result back to client
        const pairResultEnvelope: RelayEnvelope = {
          v: connState.protocolVersion,
          type: success ? 'PAIR_ACK' : 'ERROR',
          dir: 'h2c',
          seq: ++connState.outboundSeq,
          ts: Date.now(),
          epoch: connState.protocolVersion === 2 ? connState.epoch : undefined,
          payload: {
            success,
            message: success ? 'Paired successfully' : 'Invalid pairing code',
          },
        };
        const pairResultPayload = encryptEnvelope(
          pairResultEnvelope,
          session.key,
          session.sessionId,
          connState.protocolVersion,
          connState.protocolVersion === 2 ? connState.epoch : undefined,
        );
        ws.send(pairResultPayload);
        return;
      }

      if (envelope.type === 'RPC' && !session.pairingRequired) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (requestHandler as any).handle(envelope.payload);

        let response;
        if (result && typeof result[Symbol.asyncIterator] === 'function') {
          const responses = [];
          for await (const chunk of result) {
            responses.push(chunk);
          }
          response = responses[responses.length - 1];
        } else {
          response = result;
        }

        // Encrypt Response
        const respEnvelope: RelayEnvelope = {
          v: connState.protocolVersion,
          type: 'RPC',
          dir: 'h2c',
          seq: ++connState.outboundSeq,
          ts: Date.now(),
          epoch: connState.protocolVersion === 2 ? connState.epoch : undefined,
          payload: response,
        };
        const responsePayload = encryptEnvelope(
          respEnvelope,
          session.key,
          session.sessionId,
          connState.protocolVersion,
          connState.protocolVersion === 2 ? connState.epoch : undefined,
        );
        ws.send(responsePayload);
      }
    } catch (e) {
      logger.error(
        JSON.stringify({
          event: 'relay_message_error',
          sessionIdHash: session.sessionId.slice(0, 8),
          error: (e as Error).message,
          timestamp: Date.now(),
        }),
      );
    }
  });

  ws.on('error', (e) => {
    logger.error(
      JSON.stringify({
        event: 'relay_ws_error',
        sessionIdHash: session.sessionId.slice(0, 8),
        error: e.message,
        timestamp: Date.now(),
      }),
    );
  });

  ws.on('close', () => {
    session.reconnectAttempts++;
    const delay = Math.min(
      5000 * Math.pow(2, session.reconnectAttempts - 1),
      60000,
    );
    logger.warn(
      JSON.stringify({
        event: 'relay_disconnected',
        sessionIdHash: session.sessionId.slice(0, 8),
        retryDelay: delay,
        timestamp: Date.now(),
      }),
    );
    setTimeout(
      () => runRelayConnection(session, relayUrl, requestHandler),
      delay,
    );
  });
}
