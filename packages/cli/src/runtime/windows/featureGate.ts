/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ensureAppContainerProfile, getNativeModuleStatus } from './native.js';

export interface FeatureGateResult {
  enabled: boolean;
  tier: 'appcontainer' | 'managed-local' | 'host';
  reason: string;
  prerequisites?: {
    name: string;
    met: boolean;
    message: string;
  }[];
}

export async function checkAppContainerGate(): Promise<FeatureGateResult> {
  const enabledEnv =
    process.env['TERMINAI_WINDOWS_APPCONTAINER']?.toLowerCase();
  if (enabledEnv !== '1' && enabledEnv !== 'true') {
    return {
      enabled: false,
      tier: 'managed-local',
      reason: 'AppContainer not explicitly enabled',
    };
  }

  if (process.platform !== 'win32') {
    return {
      enabled: false,
      tier: 'host',
      reason: 'AppContainer requires Windows',
    };
  }

  const prerequisites = await checkPrerequisites();
  const allMet = prerequisites.every((p) => p.met);

  if (!allMet) {
    const failed = prerequisites.filter((p) => !p.met);
    return {
      enabled: false,
      tier: 'managed-local',
      reason: `Prerequisites not met: ${failed.map((p) => p.name).join(', ')}`,
      prerequisites,
    };
  }

  return {
    enabled: true,
    tier: 'appcontainer',
    reason: 'All prerequisites met',
    prerequisites,
  };
}

async function checkPrerequisites(): Promise<
  NonNullable<FeatureGateResult['prerequisites']>
> {
  const results: NonNullable<FeatureGateResult['prerequisites']> = [];

  const nativeStatus = getNativeModuleStatus();
  results.push({
    name: 'native-module',
    met: nativeStatus.available,
    message: nativeStatus.available
      ? `Loaded from ${nativeStatus.source}`
      : (nativeStatus.error ?? 'Not available'),
  });

  if (nativeStatus.available) {
    try {
      const sid = ensureAppContainerProfile();
      results.push({
        name: 'appcontainer-profile',
        met: Boolean(sid),
        message: sid ? 'Profile available' : 'Failed to ensure profile',
      });
    } catch (error) {
      results.push({
        name: 'appcontainer-profile',
        met: false,
        message: (error as Error).message,
      });
    }
  }

  return results;
}
