/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
// StreamingWhisper imported dynamically in tests below
import { EventEmitter } from 'node:events';

describe('StreamingWhisper', () => {
  const stdout = new EventEmitter();
  const stdin: {
    write: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
  } = {
    write: vi.fn(),
    end: vi.fn(),
  };
  let spawnMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    stdout.removeAllListeners();
    stdin.write.mockReset();
    stdin.end.mockReset();
    spawnMock = vi.fn().mockReturnValue({
      stdout,
      stdin,
      on: vi.fn(),
      kill: vi.fn(),
    });
    vi.doMock('node:child_process', () => ({ spawn: spawnMock }));
  });

  it('spawns whisper and emits transcription events', async () => {
    const { StreamingWhisper: WhisperImpl } = await import(
      './StreamingWhisper.js'
    );
    const whisper = new WhisperImpl({ modelPath: 'models/ggml-base.bin' });
    const handler = vi.fn();
    whisper.on('transcription', handler);
    whisper.startStreaming();
    expect(spawnMock).toHaveBeenCalled();

    stdout.emit(
      'data',
      Buffer.from(
        `${JSON.stringify({ text: 'hello', final: true, confidence: 0.9 })}\n`,
      ),
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'hello', isFinal: true }),
    );
  });

  it('writes audio to stdin and stops', async () => {
    const { StreamingWhisper: WhisperImpl } = await import(
      './StreamingWhisper.js'
    );
    const whisper = new WhisperImpl({ modelPath: 'models/ggml-base.bin' });
    whisper.startStreaming();
    whisper.feedAudio(Buffer.from('audio'));
    whisper.stopStreaming();
    expect(stdin.write).toHaveBeenCalled();
    expect(stdin.end).toHaveBeenCalled();
  });

  it('warns on double start and exposes running state', async () => {
    const { StreamingWhisper: WhisperImpl } = await import(
      './StreamingWhisper.js'
    );
    const whisper = new WhisperImpl({ modelPath: 'models/ggml-base.bin' });
    const errorHandler = vi.fn();
    whisper.on('error', errorHandler);
    whisper.startStreaming();
    whisper.startStreaming();
    expect(errorHandler).toHaveBeenCalled();
    expect(whisper.isRunning()).toBe(true);
    whisper.stopStreaming();
    expect(whisper.isRunning()).toBe(false);
  });
});
