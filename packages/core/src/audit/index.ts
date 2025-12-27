/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './schema.js';
export * from './ledger.js';
export * from './hashChain.js';
export * from './redaction.js';
export * from './export.js';

export async function getRecentAuditEvents(
  ledger: { query: (opts: { limit: number }) => Promise<unknown[]> },
  limit = 10,
): Promise<unknown[]> {
  return ledger.query({ limit });
}
