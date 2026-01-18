/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { VoiceController } from './voiceController.js';

describe('VoiceController', () => {
  it('stops speaking when interrupted', async () => {
    let resolveSpeak!: () => void;
    const speakPromise = new Promise<void>((resolve) => {
      resolveSpeak = resolve;
    });
    const stopSpy = vi.fn();
    const ttsProvider = {
      name: 'test',
      speak: vi.fn(() => speakPromise),
      stop: stopSpy,
    };

    const controller = new VoiceController(ttsProvider);
    const speakCall = controller.speak('hello');
    expect(controller.isSpeaking()).toBe(true);

    controller.stopSpeaking();
    expect(stopSpy).toHaveBeenCalledOnce();

    resolveSpeak();
    await speakCall;
    expect(controller.isSpeaking()).toBe(false);
  }, 15_000);

  it('no-ops when no TTS provider is configured', async () => {
    const controller = new VoiceController(null);
    await controller.speak('hello');
    expect(controller.isSpeaking()).toBe(false);
  });
});
