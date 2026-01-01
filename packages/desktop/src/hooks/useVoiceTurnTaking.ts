/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { createVoiceStateMachine, type VoiceState } from '../voice/voiceState';

/**
 * Hook for managing voice turn-taking with barge-in support.
 * Implements state machine: IDLE ↔ LISTENING ↔ PROCESSING ↔ SPEAKING.
 * Barge-in: User speech interrupts TTS by transitioning to LISTENING state.
 * @returns {Object} Voice state and control methods
 * @returns {VoiceState} state - Current voice state
 * @returns {function} startListening - Start listening for speech
 * @returns {function} stopListening - Stop listening
 * @returns {function} startSpeaking - Start TTS, returns abort signal
 * @returns {function} stopSpeaking - Stop TTS
 * @returns {function} handleUserInterrupt - Handle user barge-in
 * @returns {function} handleSttResult - Handle STT completion
 */
export function useVoiceTurnTaking() {
  const stateMachine = useRef(createVoiceStateMachine());
  const [currentState, setCurrentState] = useState<VoiceState>('IDLE');
  const ttsAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    stateMachine.current.onStateChange((newState) => {
      setCurrentState(newState);

      // Handle TTS cancellation on barge-in
      if (newState === 'LISTENING' && ttsAbortController.current) {
        ttsAbortController.current.abort();
        ttsAbortController.current = null;
      }
    });
  }, []);

  const startListening = () => {
    stateMachine.current.transition({ type: 'START_LISTENING' });
  };

  const stopListening = () => {
    stateMachine.current.transition({ type: 'STOP_LISTENING' });
  };

  const startSpeaking = () => {
    // Create abort controller for this TTS session
    ttsAbortController.current = new AbortController();
    stateMachine.current.transition({ type: 'START_SPEAKING' });
    return ttsAbortController.current.signal;
  };

  const stopSpeaking = () => {
    if (ttsAbortController.current) {
      ttsAbortController.current.abort();
      ttsAbortController.current = null;
    }
    stateMachine.current.transition({ type: 'STOP_SPEAKING' });
  };

  const handleUserInterrupt = () => {
    stateMachine.current.transition({ type: 'USER_INTERRUPT' });
  };

  const handleSttResult = () => {
    stateMachine.current.transition({ type: 'STT_RESULT' });
  };

  return {
    state: currentState,
    startListening,
    stopListening,
    startSpeaking,
    stopSpeaking,
    handleUserInterrupt,
    handleSttResult,
  };
}
