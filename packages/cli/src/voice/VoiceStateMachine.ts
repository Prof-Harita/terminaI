/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'node:events';

export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'DUCKING'
  | 'INTERRUPTED';

export type VoiceEvent =
  | { type: 'PTT_PRESS' }
  | { type: 'PTT_RELEASE' }
  | { type: 'TRANSCRIPTION_READY'; text: string }
  | { type: 'RESPONSE_READY'; text: string }
  | { type: 'TTS_START' }
  | { type: 'TTS_END' }
  | { type: 'USER_VOICE_DETECTED' }
  | { type: 'USER_VOICE_STOPPED' };

export class VoiceStateMachine extends EventEmitter {
  private state: VoiceState = 'IDLE';

  getState(): VoiceState {
    return this.state;
  }

  transition(event: VoiceEvent): void {
    const prevState = this.state;

    switch (this.state) {
      case 'IDLE':
        if (event.type === 'PTT_PRESS') {
          this.state = 'LISTENING';
          this.emit('startRecording');
          this.emit('voiceActivity', { level: 0.5 });
        } else if (event.type === 'TTS_START') {
          this.state = 'SPEAKING';
          this.emit('voiceActivity', { level: 0.2 });
        }
        break;
      case 'LISTENING':
        if (event.type === 'PTT_RELEASE') {
          this.state = 'PROCESSING';
          this.emit('stopRecording');
          this.emit('transcribe');
        }
        break;
      case 'PROCESSING':
        if (event.type === 'TRANSCRIPTION_READY') {
          this.emit('sendToLLM', event.text);
        }
        if (event.type === 'RESPONSE_READY') {
          this.emit('speak', event.text);
        }
        if (event.type === 'TTS_START') {
          this.state = 'SPEAKING';
          this.emit('voiceActivity', { level: 0.2 });
        }
        break;
      case 'SPEAKING':
        if (
          event.type === 'PTT_PRESS' ||
          event.type === 'USER_VOICE_DETECTED'
        ) {
          this.state = 'DUCKING';
          this.emit('duckAudio', 0.2);
          this.emit('voiceActivity', { level: 0.6 });
        }
        if (event.type === 'TTS_END') {
          this.state = 'IDLE';
          this.emit('voiceActivity', { level: 0 });
        }
        break;
      case 'DUCKING':
        if (event.type === 'PTT_PRESS') {
          this.state = 'INTERRUPTED';
          this.emit('stopTTS');
          this.emit('startRecording');
        } else if (event.type === 'USER_VOICE_STOPPED') {
          this.state = 'SPEAKING';
          this.emit('restoreAudio', 1.0);
          this.emit('voiceActivity', { level: 0.2 });
        }
        break;
      case 'INTERRUPTED':
        this.state = 'LISTENING';
        this.emit('startRecording');
        this.emit('voiceActivity', { level: 0.8 });
        break;
      default:
        break;
    }

    if (prevState !== this.state) {
      this.emit('stateChange', { from: prevState, to: this.state });
    }
  }
}
