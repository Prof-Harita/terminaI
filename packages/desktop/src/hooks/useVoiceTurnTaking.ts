/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { createVoiceStateMachine, type VoiceState } from '../voice/voiceState';

/**
 * Hook for managing voice turn-taking with barge-in support
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
