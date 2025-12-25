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

export async function connectToRelay(
  relayUrl: string,
  requestHandler: DefaultRequestHandler,
) {
  const sessionId = uuidv4();
  // Generate 256-bit key for AES-GCM
  const key = crypto.randomBytes(32);
  const keyBase64 = key.toString('base64');

  // Construct user-friendly URL (Key is in hash, so it's never sent to server)
  // Assuming default relay URL, but if it's custom, we include it.
  // Default published Web Client URL: https://terminai.org/remote
  const webClientUrl =
    process.env['GEMINI_WEB_CLIENT_URL'] || 'https://terminai.org/remote';
  const connectionString = `${webClientUrl}#session=${sessionId}&key=${encodeURIComponent(keyBase64)}&relay=${encodeURIComponent(relayUrl)}`;

  logger.info('[Relay] Connecting to Cloud Relay...');
  const ws = new WebSocket(`${relayUrl}?role=host&session=${sessionId}`);

  ws.on('open', () => {
    logger.info('[Relay] Connected! 🚀');
    logger.info(`[Relay] Remote Access URL: ${connectionString}`);
    logger.info(
      '[Relay] (Share this URL securely. The key is in the hash and never verified by the server)',
    );
  });

  ws.on('message', async (data) => {
    try {
      // 1. Decrypt
      // Protocol: IV (12 bytes) + Ciphertext
      // We expect data as Buffer
      if (!Buffer.isBuffer(data)) {
        logger.warn('[Relay] Received non-buffer data');
        return;
      }

      const iv = data.subarray(0, 12);
      const ciphertext = data.subarray(12);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      // We need the auth tag.
      // E2EE Protocol simplified:
      // Message = IV (12) + Tag (16) + Ciphertext (N)
      // Client must send it in this format.

      const tag = ciphertext.subarray(0, 16);
      const actualCiphertext = ciphertext.subarray(16);

      decipher.setAuthTag(tag);
      let decrypted = decipher.update(actualCiphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const requestJson = JSON.parse(decrypted.toString('utf8'));

      // 2. Handle Request
      // We need to construct a pseudo-AgentRequest
      // Or if requestJson IS the AgentRequest

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (requestHandler as any).handle(requestJson);

      // Handle AsyncGenerator (streaming) vs single response
      let response;
      if (result && typeof result[Symbol.asyncIterator] === 'function') {
        // It's an AsyncGenerator - collect all responses
        const responses = [];
        for await (const chunk of result) {
          responses.push(chunk);
        }
        // Send final aggregated response (or last one)
        response = responses[responses.length - 1];
      } else {
        response = result;
      }

      // 3. Encrypt Response
      const responseBuffer = Buffer.from(JSON.stringify(response), 'utf8');
      const respIv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, respIv);

      let respCiphertext = cipher.update(responseBuffer);
      respCiphertext = Buffer.concat([respCiphertext, cipher.final()]);
      const respTag = cipher.getAuthTag();

      // Format: IV (12) + Tag (16) + Ciphertext
      const payload = Buffer.concat([respIv, respTag, respCiphertext]);

      ws.send(payload);
    } catch (e) {
      logger.error('[Relay] Error handling message:', e);
    }
  });

  ws.on('error', (e) => {
    logger.error('[Relay] WebSocket Error:', e);
  });

  let reconnectAttempts = 0;
  ws.on('close', () => {
    reconnectAttempts++;
    const delay = Math.min(5000 * Math.pow(2, reconnectAttempts - 1), 60000);
    logger.warn(`[Relay] Disconnected. Retrying in ${delay / 1000}s...`);
    setTimeout(() => connectToRelay(relayUrl, requestHandler), delay);
  });
}
