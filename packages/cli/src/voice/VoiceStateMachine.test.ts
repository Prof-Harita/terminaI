/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { VoiceStateMachine } from './VoiceStateMachine.js';

describe('VoiceStateMachine', () => {
  it('transitions idle -> listening -> processing on PTT', () => {
    const sm = new VoiceStateMachine();
    sm.transition({ type: 'PTT_PRESS' });
    expect(sm.getState()).toBe('LISTENING');
    sm.transition({ type: 'PTT_RELEASE' });
    expect(sm.getState()).toBe('PROCESSING');
  });

  it('enters speaking and supports ducking/interruption', () => {
    const sm = new VoiceStateMachine();
    const duck = vi.fn();
    const stopTts = vi.fn();
    sm.on('duckAudio', duck);
    sm.on('stopTTS', stopTts);

    sm.transition({ type: 'TTS_START' });
    expect(sm.getState()).toBe('SPEAKING');
    sm.transition({ type: 'USER_VOICE_DETECTED' });
    expect(sm.getState()).toBe('DUCKING');
    expect(duck).toHaveBeenCalled();

    sm.transition({ type: 'PTT_PRESS' });
    expect(sm.getState()).toBe('INTERRUPTED');
    expect(stopTts).toHaveBeenCalled();
    sm.transition({ type: 'PTT_RELEASE' });
    expect(['PROCESSING', 'LISTENING']).toContain(sm.getState());
  });

  it('returns to idle after TTS end', () => {
    const sm = new VoiceStateMachine();
    sm.transition({ type: 'TTS_START' });
    sm.transition({ type: 'TTS_END' });
    expect(sm.getState()).toBe('IDLE');
  });
});
