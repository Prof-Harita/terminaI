/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
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
      this.emit(
        'error',
        new Error('StreamingWhisper already running; stop before restarting.'),
      );
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

    // Buffer to accumulate partial lines across chunks
    let stdoutBuffer = '';

    this.whisperProcess.stdout.on('data', (chunk: Buffer) => {
      // Append incoming chunk to buffer
      stdoutBuffer += chunk.toString();

      // Split on newlines
      const lines = stdoutBuffer.split('\n');

      // Keep the last partial line in the buffer
      stdoutBuffer = lines.pop() ?? '';

      // Process complete lines
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
      stdoutBuffer = '';
      this.whisperProcess = null;
      this.emit('close');
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
    try {
      this.whisperProcess.stdin.end();
    } catch {
      // noop: stdin might already be closed.
    }
    this.whisperProcess.kill('SIGTERM');
    this.whisperProcess = null;
  }

  isRunning(): boolean {
    return this.whisperProcess !== null;
  }
}
