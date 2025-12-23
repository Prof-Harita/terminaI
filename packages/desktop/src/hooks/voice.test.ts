/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useVoiceStore } from '../stores/voiceStore';
import { encodeWAV } from './useAudioRecorder';
import { deriveSpokenReply } from '../utils/spokenReply';

describe('voiceStore', () => {
  beforeEach(() => {
    useVoiceStore.setState({ state: 'IDLE', ttsAbortController: null });
  });

  it('starts in IDLE', () => {
    expect(useVoiceStore.getState().state).toBe('IDLE');
  });

  it('transitions LISTENING → PROCESSING', () => {
    useVoiceStore.getState().startListening();
    expect(useVoiceStore.getState().state).toBe('LISTENING');

    useVoiceStore.getState().stopListening();
    expect(useVoiceStore.getState().state).toBe('PROCESSING');
  });

  it('barge-in aborts speaking', () => {
    const signal = useVoiceStore.getState().startSpeaking();
    expect(useVoiceStore.getState().state).toBe('SPEAKING');
    expect(signal.aborted).toBe(false);

    useVoiceStore.getState().startListening();
    expect(signal.aborted).toBe(true);
    expect(useVoiceStore.getState().state).toBe('LISTENING');
  });
});

describe('encodeWAV', () => {
  it('writes a valid WAV header', () => {
    const wav = encodeWAV(new Float32Array([0, 0.5, -0.5]), 16000);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    expect(String.fromCharCode(...wav.slice(12, 16))).toBe('fmt ');
    expect(String.fromCharCode(...wav.slice(36, 40))).toBe('data');
    expect(wav.length).toBe(44 + 3 * 2);
  });
});

describe('deriveSpokenReply', () => {
  it('returns the first sentence (truncated)', () => {
    const text =
      'Here is a long response. This part should not be spoken. Another sentence.';
    const spoken = deriveSpokenReply(text, 4);
    expect(spoken).toBe('Here is a long...');
  });
});
