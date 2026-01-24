/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RuntimeContext } from '@terminai/core';
import type { FeatureGateResult } from './featureGate.js';

export interface RuntimeBannerInfo {
  tier: 'appcontainer' | 'managed-local' | 'host';
  isolated: boolean;
  brokeredOperations: string[];
  warnings: string[];
}

export function getRuntimeBannerInfo(
  gateResult: FeatureGateResult,
): RuntimeBannerInfo {
  if (gateResult.tier === 'appcontainer') {
    return {
      tier: 'appcontainer',
      isolated: true,
      brokeredOperations: ['execute', 'spawn', 'file-write', 'network'],
      warnings: [],
    };
  }

  if (gateResult.tier === 'managed-local') {
    return {
      tier: 'managed-local',
      isolated: false,
      brokeredOperations: [],
      warnings: ['Running without AppContainer isolation', gateResult.reason],
    };
  }

  return {
    tier: 'host',
    isolated: false,
    brokeredOperations: [],
    warnings: ['Running in host mode (no isolation)'],
  };
}

export function getRuntimeBannerInfoFromContext(
  runtime?: RuntimeContext,
): RuntimeBannerInfo {
  if (!runtime) {
    return {
      tier: 'host',
      isolated: false,
      brokeredOperations: [],
      warnings: ['Runtime not initialized'],
    };
  }

  if (runtime.type === 'windows-appcontainer') {
    return {
      tier: 'appcontainer',
      isolated: runtime.isIsolated,
      brokeredOperations: ['execute', 'spawn', 'file-write', 'network'],
      warnings: [],
    };
  }

  if (runtime.type === 'container' || runtime.type === 'microvm') {
    return {
      tier: 'appcontainer',
      isolated: runtime.isIsolated,
      brokeredOperations: [],
      warnings: [],
    };
  }

  return {
    tier: 'host',
    isolated: runtime.isIsolated,
    brokeredOperations: [],
    warnings: ['Running in host mode (no isolation)'],
  };
}
