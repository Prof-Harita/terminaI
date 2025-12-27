/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export type BrainAuthority = 'advisory' | 'escalate-only' | 'governing';

export const DEFAULT_BRAIN_AUTHORITY: BrainAuthority = 'escalate-only';

const BRAIN_AUTHORITY_ORDER: BrainAuthority[] = [
  'advisory',
  'escalate-only',
  'governing',
];

export function isBrainAuthority(value: unknown): value is BrainAuthority {
  return (
    typeof value === 'string' &&
    BRAIN_AUTHORITY_ORDER.includes(value as BrainAuthority)
  );
}

export function compareBrainAuthority(
  left: BrainAuthority,
  right: BrainAuthority,
): number {
  return (
    BRAIN_AUTHORITY_ORDER.indexOf(left) -
    BRAIN_AUTHORITY_ORDER.indexOf(right)
  );
}

export function resolveEffectiveBrainAuthority(
  configured: BrainAuthority | undefined,
  policyFloor?: BrainAuthority,
): BrainAuthority {
  const base = configured ?? DEFAULT_BRAIN_AUTHORITY;
  if (!policyFloor) {
    return base;
  }
  return compareBrainAuthority(base, policyFloor) >= 0 ? base : policyFloor;
}
