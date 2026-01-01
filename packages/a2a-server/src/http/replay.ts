/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type express from 'express';
import crypto from 'node:crypto';
import type { AuthenticatedRequest } from './auth.js';

const DEFAULT_NONCE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_NONCES = 5000;
const METHODS_REQUIRING_SIGNATURE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type ReplayOptions = {
  ttlMs?: number;
  maxEntries?: number;
};

export function computeBodyHash(body?: Buffer | string): string {
  const raw = body
    ? Buffer.isBuffer(body)
      ? body
      : Buffer.from(body)
    : Buffer.from('');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function buildSignaturePayload(input: {
  method: string;
  path: string;
  bodyHash: string;
  nonce: string;
}): string {
  return [
    input.method.toUpperCase(),
    input.path,
    input.bodyHash,
    input.nonce,
  ].join('\n');
}

function safeEqualHex(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(actual, 'hex');
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function createReplayProtection(
  options?: ReplayOptions,
): express.RequestHandler {
  const ttlMs = options?.ttlMs ?? DEFAULT_NONCE_TTL_MS;
  const maxEntries = options?.maxEntries ?? DEFAULT_MAX_NONCES;
  const nonceStore = new Map<string, number>();

  function prune(now: number) {
    for (const [nonce, timestamp] of nonceStore) {
      if (now - timestamp > ttlMs) {
        nonceStore.delete(nonce);
      }
    }
    while (nonceStore.size > maxEntries) {
      const oldestKey = nonceStore.keys().next().value;
      if (!oldestKey) {
        break;
      }
      nonceStore.delete(oldestKey);
    }
  }

  return (req, res, next) => {
    if (!METHODS_REQUIRING_SIGNATURE.has(req.method)) {
      return next();
    }

    const token = (req as AuthenticatedRequest).remoteAuthToken;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const nonce = req.header('x-gemini-nonce');
    const signature = req.header('x-gemini-signature');
    if (!nonce || !signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const now = Date.now();
    prune(now);

    if (nonceStore.has(nonce)) {
      return res.status(401).json({ error: 'Replay detected' });
    }

    const rawBody = (req as AuthenticatedRequest).rawBody;
    const bodyHash = computeBodyHash(rawBody);
    const payload = buildSignaturePayload({
      method: req.method,
      path: req.originalUrl,
      bodyHash,
      nonce,
    });
    const expectedSignature = crypto
      .createHmac('sha256', token)
      .update(payload)
      .digest('hex');

    if (!safeEqualHex(expectedSignature, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    nonceStore.set(nonce, now);
    return next();
  };
}
