/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { stableStringify } from '../policy/stable-stringify.js';
import type { AuditEvent } from './schema.js';

export interface HashResult {
  hash: string;
  prevHash: string;
}

function normalizeEventForHash(event: AuditEvent): Record<string, unknown> {
  const { hash: _hash, prevHash: _prevHash, ...rest } = event as unknown as Record<
    string,
    unknown
  >;
  return rest;
}

export function computeHash(
  event: AuditEvent,
  previousHash: string,
): HashResult {
  const normalized = normalizeEventForHash(event);
  const serialized = stableStringify(normalized);
  const hash = crypto
    .createHash('sha256')
    .update(previousHash + serialized)
    .digest('hex');
  return { hash, prevHash: previousHash };
}

export function verifyHashChain(
  events: AuditEvent[],
): { ok: boolean; error?: string } {
  let prevHash = '';
  for (const [index, event] of events.entries()) {
    const { hash, prevHash: expectedPrevHash } = event;
    const { hash: computedHash, prevHash: computedPrev } = computeHash(
      event,
      prevHash,
    );
    if (expectedPrevHash !== computedPrev) {
      return {
        ok: false,
        error: `Hash chain break at index ${index}: expected prevHash=${computedPrev}, found ${expectedPrevHash}`,
      };
    }
    if (hash !== computedHash) {
      return {
        ok: false,
        error: `Hash mismatch at index ${index}`,
      };
    }
    prevHash = hash ?? '';
  }
  return { ok: true };
}
