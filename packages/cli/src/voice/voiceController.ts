/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TtsProvider } from './tts/types.js';
import { AudioController } from './AudioController.js';
import type { VoiceStateMachine } from './VoiceStateMachine.js';

export class VoiceController {
  private readonly audio: AudioController | null;
  private speaking = false;
  private voiceStateMachine: VoiceStateMachine | null;

  constructor(
    ttsProvider: TtsProvider | null,
    voiceStateMachine?: VoiceStateMachine | null,
  ) {
    this.audio = ttsProvider ? new AudioController(ttsProvider) : null;
    this.voiceStateMachine = voiceStateMachine ?? null;
  }

  isSpeaking(): boolean {
    return this.speaking || !!this.audio?.isSpeaking();
  }

  async speak(text: string): Promise<void> {
    if (!this.audio) {
      return;
    }
    if (this.speaking) {
      this.stopSpeaking();
    }
    this.speaking = true;
    this.voiceStateMachine?.transition({ type: 'TTS_START' });
    try {
      await this.audio.speak(text);
    } finally {
      this.voiceStateMachine?.transition({ type: 'TTS_END' });
      this.speaking = false;
    }
  }

  stopSpeaking(): void {
    this.audio?.interrupt();
    this.voiceStateMachine?.transition({ type: 'TTS_END' });
    this.speaking = false;
  }

  duck(volume: number): void {
    this.audio?.duck(volume);
  }

  restore(): void {
    this.audio?.restore();
  }

  bindStateMachine(stateMachine: VoiceStateMachine | null): void {
    this.voiceStateMachine = stateMachine;
  }
}
