/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'node:events';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

export interface TranscriptionChunk {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface StreamingWhisperOptions {
  modelPath: string;
  binary?: string;
}

export class StreamingWhisper extends EventEmitter {
  private whisperProcess: ChildProcessWithoutNullStreams | null = null;

  constructor(private readonly options: StreamingWhisperOptions) {
    super();
  }

  startStreaming(): void {
    if (this.whisperProcess) {
      return;
    }
    const binary = this.options.binary ?? 'whisper-cpp';
    this.whisperProcess = spawn(binary, [
      '--model',
      this.options.modelPath,
      '--stream',
      '--output-format',
      'json',
    ]);

    this.whisperProcess.stdout.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }
        try {
          const parsed = JSON.parse(line);
          this.emit('transcription', {
            text: parsed.text ?? '',
            isFinal: Boolean(parsed.final),
            confidence: parsed.confidence ?? 0,
          } as TranscriptionChunk);
        } catch {
          // ignore non-JSON noise
        }
      }
    });

    this.whisperProcess.on('error', (error) => {
      this.emit('error', error);
    });

    this.whisperProcess.on('close', () => {
      this.whisperProcess = null;
    });
  }

  feedAudio(chunk: Buffer): void {
    if (!this.whisperProcess) {
      return;
    }
    this.whisperProcess.stdin.write(chunk);
  }

  stopStreaming(): void {
    if (!this.whisperProcess) {
      return;
    }
    this.whisperProcess.stdin.end();
    this.whisperProcess.kill('SIGTERM');
    this.whisperProcess = null;
  }
}
