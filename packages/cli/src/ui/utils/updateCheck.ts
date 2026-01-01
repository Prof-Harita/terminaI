/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LoadedSettings } from '../../config/settings.js';

export const FETCH_TIMEOUT_MS = 2000;

// Replicating the bits of UpdateInfo we need from update-notifier
export interface UpdateInfo {
  latest: string;
  current: string;
  name: string;
  type?: string;
}

export interface UpdateObject {
  message: string;
  update: UpdateInfo;
}

export async function checkForUpdates(
  _settings: LoadedSettings,
): Promise<UpdateObject | null> {
  // Disabled for Stable Core v0.21 - terminaI freeze policy
  return null;
}
