/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface UseTtsOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook for text-to-speech using Tauri piper integration
 */
export function useTts({ onStart, onEnd, onError }: UseTtsOptions = {}) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const currentAbortController = useRef<AbortController | null>(null);

  const speak = async (
    text: string,
    options?: { signal?: AbortSignal; volume?: number },
  ) => {
    try {
      // Store abort controller
      const abortController = new AbortController();
      currentAbortController.current = abortController;

      // Listen to external signal if provided
      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          abortController.abort();
        });
      }

      onStart?.();

      // Call Tauri TTS command
      const result = await invoke<{ wav_bytes: number[] }>('tts_synthesize', {
        text,
      });

      if (abortController.signal.aborted) {
        onEnd?.();
        return;
      }

      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContext.createGain();
        gainNodeRef.current.connect(audioContext.destination);
      }

      // Decode WAV bytes to audio buffer
      const wavBytes = new Uint8Array(result.wav_bytes);
      const audioBuffer = await audioContext.decodeAudioData(wavBytes.buffer);

      if (abortController.signal.aborted) {
        onEnd?.();
        return;
      }

      // Stop any currently playing audio
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      }

      // Create and play audio source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      const gain = gainNodeRef.current;
      const volume =
        typeof options?.volume === 'number'
          ? Math.max(0, Math.min(1, options.volume))
          : 1;
      if (gain) {
        gain.gain.value = volume;
        source.connect(gain);
      } else {
        source.connect(audioContext.destination);
      }
      sourceNodeRef.current = source;

      source.onended = () => {
        if (sourceNodeRef.current === source) {
          sourceNodeRef.current = null;
        }
        if (!abortController.signal.aborted) {
          onEnd?.();
        }
      };

      // Check for abort before playing
      if (abortController.signal.aborted) {
        onEnd?.();
        return;
      }

      source.start();

      // Listen for abort during playback
      abortController.signal.addEventListener('abort', () => {
        if (source) {
          source.stop();
          source.disconnect();
        }
        onEnd?.();
      });
    } catch (err) {
      console.error('TTS failed:', err);
      const message =
        err instanceof Error ? err.message : 'Speech synthesis failed';
      onError?.(message);
      onEnd?.();
    } finally {
      currentAbortController.current = null;
    }
  };

  const stop = () => {
    if (currentAbortController.current) {
      currentAbortController.current.abort();
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => () => {
      stop();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }, []);

  return {
    speak,
    stop,
  };
}
