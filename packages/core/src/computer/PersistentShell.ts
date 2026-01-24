/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IPty } from '@lydell/node-pty';
import { getPty, type PtyImplementation } from '../utils/getPty.js';

import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { debugLogger } from '../index.js';

export interface PersistentShellOptions {
  language: 'python' | 'shell' | 'node';
  cwd: string;
  env?: Record<string, string>;
  /**
   * Optional: Absolute path to Python executable.
   * When provided, PersistentShell will use this Python directly,
   * skipping internal venv creation. Caller must guarantee that
   * terminai_apts is importable from this Python.
   */
  pythonPath?: string;
  onOutput: (data: string) => void;
  onExit: (code: number | null, signal: number | null) => void;
}

export class PersistentShell {
  private ptyProcess: IPty | null = null;
  private disposables: Array<() => void> = [];
  private tempVenvPath: string | null = null;
  private ptyModule: PtyImplementation = null;
  private initPromise: Promise<void>;

  constructor(private readonly options: PersistentShellOptions) {
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    this.ptyModule = await getPty();
    if (!this.ptyModule) {
      debugLogger.error(
        'No PTY implementation available (node-pty or @lydell/node-pty)',
      );
      this.options.onExit(1, null);
      return;
    }
    this.spawn();
  }

  /** Wait for initialization to complete */
  async ready(): Promise<void> {
    return this.initPromise;
  }

  get pid(): number {
    return this.ptyProcess?.pid ?? -1;
  }

  get isAlive(): boolean {
    return !!this.ptyProcess;
  }

  private spawn() {
    if (!this.ptyModule) {
      this.options.onExit(1, null);
      return;
    }

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
        if (this.options.pythonPath) {
          // RuntimeContext provides pre-configured Python with T-APTS
          command = this.options.pythonPath;
          args = ['-i', '-u']; // Interactive, unbuffered
          debugLogger.log(`Using provided Python: ${command}`);
          // Skip venv creation - caller guarantees T-APTS availability
          // We still inherit the process.env unless explicitly overridden
        } else {
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
            // Fallback to system python if venv creation fails
            command = 'python3';
            args = ['-i', '-u'];
          }
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

    if (language === 'python' && this.options.pythonPath) {
      try {
        this.validateExecutable(this.options.pythonPath);
      } catch (error) {
        debugLogger.error(`Python validation failed: ${error}`);
        this.options.onExit(1, null);
        return;
      }
    }

    try {
      this.ptyProcess = this.ptyModule.module.spawn(command, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: spawnEnv as Record<string, string>,
      });

      const onData = this.ptyProcess!.onData((data: string) => {
        this.options.onOutput(data);
      });
      this.disposables.push(() => onData.dispose());

      const onExit = this.ptyProcess!.onExit(
        ({ exitCode, signal }: { exitCode: number; signal?: number }) => {
          this.options.onExit(exitCode ?? null, signal ?? null);
          this.ptyProcess = null;
        },
      );
      this.disposables.push(() => onExit.dispose());
    } catch (error) {
      debugLogger.error(
        `Failed to spawn PersistentShell (${language}): ${error}`,
      );
      // Notify exit immediately if spawn failed
      this.options.onExit(1, null);
    }
  }

  private validateExecutable(execPath: string): void {
    // Check if path is absolute and exists
    if (path.isAbsolute(execPath)) {
      if (!fs.existsSync(execPath)) {
        throw new Error(
          `Python executable not found at "${execPath}". ` +
            `This may indicate a runtime environment mismatch.`,
        );
      }
    } else {
      // Check if command is in PATH
      try {
        execSync(
          os.platform() === 'win32' ? `where ${execPath}` : `which ${execPath}`,
          {
            stdio: 'ignore',
          },
        );
      } catch {
        throw new Error(
          `Python executable "${execPath}" not found in PATH. ` +
            `Ensure Python is installed and accessible.`,
        );
      }
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
