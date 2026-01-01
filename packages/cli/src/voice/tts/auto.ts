/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import commandExists from 'command-exists';
import type { TtsProvider, SpeakOptions } from './types.js';

type AutoProviderOptions = {
  platform?: NodeJS.Platform;
  commandExists?: (command: string) => boolean;
};

type CommandArgsBuilder = (text: string, options?: SpeakOptions) => string[];

function createCommandTtsProvider(
  name: string,
  command: string,
  buildArgs: CommandArgsBuilder,
): TtsProvider {
  let currentProcess: ChildProcess | null = null;

  const stop = () => {
    if (currentProcess && !currentProcess.killed) {
      currentProcess.kill('SIGTERM');
    }
  };

  const speak = (text: string, options?: SpeakOptions): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!text.trim()) {
        resolve();
        return;
      }
      const child = spawn(command, buildArgs(text, options), {
        stdio: 'ignore',
      });
      currentProcess = child;
      const onAbort = () => {
        stop();
      };
      if (options?.signal) {
        if (options.signal.aborted) {
          stop();
          resolve();
          return;
        }
        options.signal.addEventListener('abort', onAbort, { once: true });
      }
      child.once('error', (err) => {
        currentProcess = null;
        if (options?.signal) {
          options.signal.removeEventListener('abort', onAbort);
        }
        reject(err);
      });
      child.once('exit', (code, signal) => {
        currentProcess = null;
        if (options?.signal) {
          options.signal.removeEventListener('abort', onAbort);
        }
        if (signal || code === null || code === 0) {
          resolve();
          return;
        }
        reject(new Error(`${name} exited with code ${code}`));
      });
    });

  return { name, speak, stop };
}

export function resolveAutoTtsProvider(
  options: AutoProviderOptions = {},
): TtsProvider | null {
  const platform = options.platform ?? process.platform;
  const exists = options.commandExists ?? commandExists.sync;

  if (platform === 'darwin' && exists('say')) {
    return createCommandTtsProvider('say', 'say', (text) => [text]);
  }
  if (platform === 'linux' && exists('spd-say')) {
    return createCommandTtsProvider('spd-say', 'spd-say', (text) => [text]);
  }
  if (platform === 'linux' && exists('espeak')) {
    return createCommandTtsProvider(
      'espeak',
      'espeak',
      (text, speakOptions) => {
        const args = [text];
        if (typeof speakOptions?.volume === 'number') {
          // espeak expects amplitude between 0-200
          const amplitude = Math.round(
            Math.max(0, Math.min(1, speakOptions.volume)) * 200,
          );
          args.unshift(`-a${amplitude}`);
        }
        return args;
      },
    );
  }
  if (platform === 'win32' && exists('powershell')) {
    return createCommandTtsProvider('powershell', 'powershell', (text) => [
      '-NoProfile',
      '-Command',
      `Add-Type -AssemblyName System.Speech; ` +
        `(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${text.replace(/'/g, "''")}')`,
    ]);
  }

  return null;
}
