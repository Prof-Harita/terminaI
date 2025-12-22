/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Voice state machine for Desktop voice UI
 */

export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

export interface VoiceStateMachine {
  currentState: VoiceState;
  transition(event: VoiceEvent): void;
  onStateChange(listener: (state: VoiceState) => void): void;
}

export type VoiceEvent =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'STT_RESULT' }
  | { type: 'START_SPEAKING' }
  | { type: 'STOP_SPEAKING' }
  | { type: 'USER_INTERRUPT' };

/**
 * Create a voice state machine instance
 */
export function createVoiceStateMachine(): VoiceStateMachine {
  let state: VoiceState = 'IDLE';
  const listeners: Array<(state: VoiceState) => void> = [];

  const setState = (newState: VoiceState) => {
    if (state !== newState) {
      state = newState;
      listeners.forEach((listener) => listener(state));
    }
  };

  const transition = (event: VoiceEvent) => {
    switch (state) {
      case 'IDLE':
        if (event.type === 'START_LISTENING') {
          setState('LISTENING');
        } else if (event.type === 'START_SPEAKING') {
          setState('SPEAKING');
        }
        break;

      case 'LISTENING':
        if (event.type === 'STOP_LISTENING' || event.type === 'STT_RESULT') {
          setState('PROCESSING');
        } else if (event.type === 'USER_INTERRUPT') {
          setState('IDLE');
        }
        break;

      case 'PROCESSING':
        if (event.type === 'START_SPEAKING') {
          setState('SPEAKING');
        } else if (event.type === 'USER_INTERRUPT') {
          setState('IDLE');
        }
        break;

      case 'SPEAKING':
        if (event.type === 'STOP_SPEAKING') {
          setState('IDLE');
        } else if (
          event.type === 'USER_INTERRUPT' ||
          event.type === 'START_LISTENING'
        ) {
          // Barge-in: interrupt speaking immediately
          setState('LISTENING');
        }
        break;

      default:
        // No state transition for unknown states
        break;
    }
  };

  const onStateChange = (listener: (state: VoiceState) => void) => {
    listeners.push(listener);
  };

  return {
    get currentState() {
      return state;
    },
    transition,
    onStateChange,
  };
}
