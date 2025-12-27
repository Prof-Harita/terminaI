/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { persistentState } from './persistentState.js';

type WebRemoteConsentState = {
  accepted: boolean;
  timestamp: string;
};

export function getWebRemoteConsent(): WebRemoteConsentState | undefined {
  return persistentState.get('webRemoteConsent');
}

export function setWebRemoteConsent(accepted: boolean): void {
  const state: WebRemoteConsentState = {
    accepted,
    timestamp: new Date().toISOString(),
  };
  persistentState.set('webRemoteConsent', state);
}

export function hasAcceptedWebRemoteConsent(): boolean {
  return getWebRemoteConsent()?.accepted === true;
}
