/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import commandExists from 'command-exists';
import type { TtsProvider } from './tts/types.js';

function clampVolume(level: number): number {
  if (!Number.isFinite(level)) {
    return 1;
  }
  return Math.max(0, Math.min(1, level));
}

/**
 * AudioController wraps the TTS provider with duck/restore/interrupt support.
 * It uses AbortSignals for fast interruption and attempts best-effort
 * system-volume ducking when supported on the host.
 */
export class AudioController {
  private readonly ttsProvider: TtsProvider | null;
  private abortController: AbortController | null = null;
  private currentVolume = 1;
  private speaking = false;
  private baselineVolume: number | null = null;

  constructor(ttsProvider: TtsProvider | null) {
    this.ttsProvider = ttsProvider;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  async speak(text: string): Promise<void> {
    if (!this.ttsProvider) {
      return;
    }
    if (!text.trim()) {
      return;
    }
    this.abortController?.abort();
    this.abortController = new AbortController();
    this.speaking = true;
    try {
      await this.ttsProvider.speak(text, {
        signal: this.abortController.signal,
        volume: this.currentVolume,
      });
    } finally {
      this.speaking = false;
      this.abortController = null;
      this.restore();
    }
  }

  duck(targetVolume: number = 0.25): void {
    this.currentVolume = clampVolume(targetVolume);
    if (this.baselineVolume === null) {
      this.baselineVolume = this.readSystemVolume();
    }
    this.applyVolume(this.currentVolume);
  }

  restore(): void {
    this.currentVolume = 1;
    if (this.baselineVolume !== null) {
      this.applyVolume(this.baselineVolume);
      this.baselineVolume = null;
    } else {
      this.applyVolume(1);
    }
  }

  interrupt(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.ttsProvider?.stop?.();
    this.speaking = false;
    this.restore();
  }

  private readSystemVolume(): number | null {
    try {
      if (process.platform === 'darwin' && commandExists.sync('osascript')) {
        const output = execSync(
          "osascript -e 'output volume of (get volume settings)'",
          { encoding: 'utf8' },
        );
        const asNumber = Number.parseFloat(output.trim());
        return Number.isFinite(asNumber) ? asNumber / 100 : null;
      }
      if (process.platform === 'linux' && commandExists.sync('amixer')) {
        const output = execSync('amixer get Master', { encoding: 'utf8' });
        const match = output.match(/(\\d+)%/);
        if (match) {
          const percent = Number.parseInt(match[1] ?? '', 10);
          if (Number.isFinite(percent)) {
            return clampVolume(percent / 100);
          }
        }
      }
    } catch {
      // Ignore volume detection failures; ducking becomes a no-op.
    }
    return null;
  }

  private applyVolume(level: number): void {
    const clamped = clampVolume(level);
    try {
      if (process.platform === 'darwin' && commandExists.sync('osascript')) {
        execSync(
          `osascript -e "set volume output volume ${Math.round(clamped * 100)}"`,
          { stdio: 'ignore' },
        );
        return;
      }
      if (process.platform === 'linux' && commandExists.sync('amixer')) {
        execSync(`amixer set Master ${Math.round(clamped * 100)}%`, {
          stdio: 'ignore',
        });
      }
    } catch {
      // Swallow errors to avoid crashing the CLI if the host lacks mixers.
    }
  }
}
