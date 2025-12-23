/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAudioRecorder, encodeWAV } from '../hooks/useAudioRecorder';
import { useSettingsStore } from '../stores/settingsStore';
import { useVoiceStore } from '../stores/voiceStore';

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceOrb({ onTranscript, disabled = false }: Props) {
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const [error, setError] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState(0);
  const audioChunksRef = useRef<Float32Array[]>([]);

  const state = useVoiceStore((s) => s.state);
  const startListening = useVoiceStore((s) => s.startListening);
  const stopListening = useVoiceStore((s) => s.stopListening);
  const handleSttResult = useVoiceStore((s) => s.handleSttResult);
  const stopSpeaking = useVoiceStore((s) => s.stopSpeaking);

  // Audio recorder with callbacks
  const handleAudioData = useCallback((data: Float32Array) => {
    audioChunksRef.current.push(new Float32Array(data));
  }, []);

  const handleAmplitude = useCallback((level: number) => {
    setAmplitude(level);
  }, []);

  const {
    startRecording,
    stopRecording,
    isRecording,
    error: recorderError,
  } = useAudioRecorder({
    onAudioData: handleAudioData,
    onAmplitude: handleAmplitude,
  });

  useEffect(() => {
    if (recorderError) {
      setError(recorderError);
    }
  }, [recorderError]);

  const handleStart = useCallback(async () => {
    if (disabled) return;
    if (!voiceEnabled) return;
    audioChunksRef.current = [];
    setError(null);
    startListening();
    stopSpeaking();
    startRecording();
  }, [disabled, voiceEnabled, startListening, stopSpeaking, startRecording]);

  const handleStop = useCallback(async () => {
    stopRecording();
    stopListening();

    // Concatenate all audio chunks
    const totalLength = audioChunksRef.current.reduce(
      (sum, chunk) => sum + chunk.length,
      0,
    );
    const concatenated = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }

    // Encode to WAV
    const wavBytes = encodeWAV(concatenated, 16000);

    try {
      // Call Tauri STT command
      const result = await invoke<{ text: string; confidence?: number }>(
        'stt_transcribe',
        { wavBytes: Array.from(wavBytes) },
      );

      if (result.text) {
        handleSttResult();
        onTranscript(result.text);
      } else {
        setError('No speech detected');
      }
    } catch (err) {
      console.error('STT failed:', err);
      setError(
        err instanceof Error ? err.message : 'Speech recognition failed',
      );
    }

    audioChunksRef.current = [];
  }, [stopRecording, stopListening, handleSttResult, onTranscript]);

  // Push-to-talk: Space key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isInputFocused()) {
        e.preventDefault();
        handleStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        handleStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleStart, handleStop]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (isRecording) {
        stopRecording();
      }
    },
    [isRecording, stopRecording],
  );

  const isListening = state === 'LISTENING';
  const isSpeaking = state === 'SPEAKING';
  const isProcessing = state === 'PROCESSING';

  return (
    <button
      type="button"
      onMouseDown={handleStart}
      onMouseUp={handleStop}
      onMouseLeave={() => isListening && handleStop()}
      disabled={disabled || !voiceEnabled}
      className={`
        relative w-10 h-10 rounded-full flex items-center justify-center
        transition-all duration-200 ease-out
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${
          isListening
            ? 'bg-red-500 shadow-lg shadow-red-500/50'
            : isSpeaking
              ? 'bg-cyan-500 shadow-lg shadow-cyan-500/50'
              : isProcessing
                ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50'
                : 'bg-gray-700 hover:bg-gray-600'
        }
      `}
      title={error || getStateLabel(state)}
      aria-label={`Voice ${state.toLowerCase()}`}
    >
      {/* Pulsing ring when active */}
      {isListening && (
        <span
          className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50"
          style={{ transform: `scale(${1 + amplitude * 0.5})` }}
        />
      )}

      {isSpeaking && (
        <span className="absolute inset-0 rounded-full bg-cyan-500 animate-pulse opacity-50" />
      )}

      {/* Mic icon */}
      <svg
        className={`w-5 h-5 ${isListening || isSpeaking || isProcessing ? 'text-white' : 'text-gray-300'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>

      {/* Error indicator */}
      {error && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full" />
      )}
    </button>
  );
}

function getStateLabel(state: string): string {
  switch (state) {
    case 'IDLE':
      return 'Hold to speak';
    case 'LISTENING':
      return 'Listening...';
    case 'PROCESSING':
      return 'Thinking...';
    case 'SPEAKING':
      return 'Speaking...';
    default:
      return 'Voice';
  }
}

function isInputFocused(): boolean {
  const active = document.activeElement;
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active?.getAttribute('contenteditable') === 'true'
  );
}
