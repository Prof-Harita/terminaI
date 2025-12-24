/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as pty from 'node-pty';

import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { debugLogger } from '../index.js';

export interface PersistentShellOptions {
  language: 'python' | 'shell' | 'node';
  cwd: string;
  env?: Record<string, string>;
  onOutput: (data: string) => void;
  onExit: (code: number | null, signal: number | null) => void;
}

export class PersistentShell {
  private ptyProcess: pty.IPty | null = null;
  private disposables: Array<() => void> = [];
  private tempVenvPath: string | null = null;

  constructor(private readonly options: PersistentShellOptions) {
    this.spawn();
  }

  get pid(): number {
    return this.ptyProcess?.pid ?? -1;
  }

  get isAlive(): boolean {
    return !!this.ptyProcess;
  }

  private spawn() {
    const { language, cwd, env } = this.options;
    let command: string;
    let args: string[];
    const spawnEnv: Record<string, string | undefined> = {
      ...process.env,
      ...env,
    };

    // Resolve shell executable for 'shell' language
    const shellExe =
      process.env['SHELL'] ||
      (os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash');

    switch (language) {
      case 'python':
        // Phase 1.3: Auto-Create Virtual Environment for Python
        this.tempVenvPath = fs.mkdtempSync(
          path.join(os.tmpdir(), 'terminai-repl-'),
        );
        try {
          // Create venv
          execSync(`python3 -m venv "${this.tempVenvPath}"`, {
            stdio: 'ignore',
          });

          const pythonBin =
            os.platform() === 'win32'
              ? path.join(this.tempVenvPath, 'Scripts', 'python.exe')
              : path.join(this.tempVenvPath, 'bin', 'python3');

          command = pythonBin;
          args = ['-i', '-u']; // Interactive, unbuffered

          // Prepend venv bin to PATH to ensure subprocesses use it
          const binDir =
            os.platform() === 'win32'
              ? path.join(this.tempVenvPath, 'Scripts')
              : path.join(this.tempVenvPath, 'bin');
          spawnEnv['PATH'] =
            `${binDir}${path.delimiter}${spawnEnv['PATH'] || ''}`;
          // Unset PYTHONHOME if set, to ensure venv isolation
          delete spawnEnv['PYTHONHOME'];
        } catch (error) {
          debugLogger.error(
            `Failed to create venv for Python session: ${error}`,
          );
          // Fallback to system python if venv creation fails (though ideally we should fail)
          command = 'python3';
          args = ['-i', '-u'];
        }
        break;

      case 'node':
        command = 'node';
        args = ['--interactive'];
        break;

      case 'shell':
      default:
        command = shellExe;
        args = []; // On Windows powershell might need flags, but usually defaults are okay for simple shell
        if (os.platform() === 'win32' && command.endsWith('powershell.exe')) {
          args = ['-NoProfile', '-ExecutionPolicy', 'Bypass'];
        }
        break;
    }

    try {
      this.ptyProcess = pty.spawn(command, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: spawnEnv as Record<string, string>,
      });

      const onData = this.ptyProcess.onData((data) => {
        this.options.onOutput(data);
      });
      this.disposables.push(() => onData.dispose());

      const onExit = this.ptyProcess.onExit(({ exitCode, signal }) => {
        this.options.onExit(exitCode ?? null, signal ?? null);
        this.ptyProcess = null;
      });
      this.disposables.push(() => onExit.dispose());
    } catch (error) {
      debugLogger.error(
        `Failed to spawn PersistentShell (${language}): ${error}`,
      );
      // Notify exit immediately if spawn failed
      this.options.onExit(1, null);
    }
  }

  write(code: string): void {
    if (this.ptyProcess) {
      if (
        this.options.language === 'python' ||
        this.options.language === 'node'
      ) {
        // For REPLs, we might want to ensure a newline if the code doesn't have one
        // But usually we just write exactly what is given, plus maybe an enter key to trigger execution
        this.ptyProcess.write(code + (code.endsWith('\n') ? '' : '\n'));
      } else {
        this.ptyProcess.write(code + '\n');
      }
    }
  }

  resize(cols: number, rows: number): void {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  kill(signal?: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill(signal);
    }
  }

  dispose(): void {
    this.disposables.forEach((d) => d());
    this.disposables = [];

    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }

    // Cleanup venv if it exists
    if (this.tempVenvPath) {
      try {
        fs.rmSync(this.tempVenvPath, { recursive: true, force: true });
      } catch (error) {
        debugLogger.warn(
          `Failed to cleanup temp venv at ${this.tempVenvPath}: ${error}`,
        );
      }
      this.tempVenvPath = null;
    }
  }
}
