/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import commandExists from 'command-exists';

export interface AudioRecorderOptions {
  sampleRate?: number;
  device?: string;
}

/**
 * Minimal microphone capture wrapper that streams 16-bit PCM frames.
 * It tries a small set of platform-friendly binaries and emits errors
 * instead of throwing so the caller can surface actionable UX.
 */
export class AudioRecorder extends EventEmitter {
  private process: ChildProcess | null = null;
  private readonly chunks: Buffer[] = [];
  private readonly options: { sampleRate: number; device?: string };

  constructor(opts: AudioRecorderOptions = {}) {
    super();
    this.options = {
      sampleRate: opts.sampleRate ?? 16_000,
      device: opts.device,
    };
  }

  isRecording(): boolean {
    return this.process !== null;
  }

  start(): void {
    if (this.process) return;

    const command = this.pickRecorder();
    if (!command) {
      this.emit(
        'error',
        new Error(
          'No supported microphone capture binary found (tried sox, ffmpeg, arecord).',
        ),
      );
      return;
    }

    const proc = spawn(command.bin, command.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.process = proc as ChildProcess;

    proc.stdout.on('data', (data: Buffer) => {
      this.chunks.push(data);
      this.emit('data', data);
    });

    proc.stderr.on('data', () => {
      // Ignore noisy recorder logs; errors are handled via 'error'/'close'.
    });

    proc.on('error', (error) => {
      this.emit('error', error);
    });

    proc.on('close', () => {
      this.process = null;
      this.emit('end');
    });
  }

  stop(): void {
    if (!this.process) return;
    const proc = this.process;
    this.process = null;
    proc.kill('SIGINT');
  }

  getBufferedAudio(): Buffer {
    return Buffer.concat(this.chunks);
  }

  private pickRecorder(): { bin: string; args: string[] } | null {
    const { sampleRate, device } = this.options;

    if (commandExists.sync('sox')) {
      return {
        bin: 'sox',
        args: [
          '-q',
          ...(device ? ['-d', '-t', 'pulseaudio', device] : ['-d']),
          '-b',
          '16',
          '-c',
          '1',
          '-r',
          `${sampleRate}`,
          '-e',
          'signed-integer',
          '-t',
          'raw',
          '-',
        ],
      };
    }

    if (commandExists.sync('ffmpeg')) {
      const inputArgs =
        process.platform === 'darwin'
          ? ['-f', 'avfoundation', '-i', device ?? ':0']
          : process.platform === 'win32'
            ? ['-f', 'dshow', '-i', device ?? 'audio=default']
            : ['-f', 'alsa', '-i', device ?? 'default'];
      return {
        bin: 'ffmpeg',
        args: [
          '-hide_banner',
          '-loglevel',
          'error',
          ...inputArgs,
          '-ac',
          '1',
          '-ar',
          `${sampleRate}`,
          '-f',
          's16le',
          '-',
        ],
      };
    }

    if (commandExists.sync('arecord')) {
      return {
        bin: 'arecord',
        args: [
          '-q',
          ...(device ? ['-D', device] : []),
          '-f',
          'S16_LE',
          '-c',
          '1',
          '-r',
          `${sampleRate}`,
          '-t',
          'raw',
          '-',
        ],
      };
    }

    return null;
  }
}
