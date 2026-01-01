/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext } from 'react';
import type { VoiceState } from '../../voice/VoiceStateMachine.js';

export interface VoiceUiState {
  enabled: boolean;
  state: VoiceState;
  amplitude: number;
}

const DEFAULT_VOICE_STATE: VoiceUiState = {
  enabled: false,
  state: 'IDLE',
  amplitude: 0,
};

export const VoiceStateContext =
  createContext<VoiceUiState>(DEFAULT_VOICE_STATE);

export function useVoiceState(): VoiceUiState {
  const context = useContext(VoiceStateContext);
  return context ?? DEFAULT_VOICE_STATE;
}
