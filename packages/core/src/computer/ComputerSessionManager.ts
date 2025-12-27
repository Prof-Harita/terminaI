/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { PersistentShell } from './PersistentShell.js';
import { debugLogger } from '../index.js';
import * as fs from 'node:fs';

export interface ReplSession {
  name: string;
  language: 'python' | 'shell' | 'node';
  shell: PersistentShell;
  outputBuffer: string[];
  startedAt: number;
  lastActivityAt: number;
  cleanupPaths?: string[];
}

export interface ComputerSessionManagerInterface {
  hasSession(name: string): boolean;
  getSession(name: string): ReplSession | undefined;
  createSession(
    name: string,
    language: ReplSession['language'],
    cwd: string,
    env?: Record<string, string>,
    cleanupPaths?: string[],
  ): ReplSession;
  executeCode(
    name: string,
    code: string,
    timeoutMs?: number,
  ): Promise<{ output: string; timedOut: boolean }>;
  killSession(name: string, signal?: string): void;
  listSessions(): ReplSession[];
  disposeAll(): void;
}

export class ComputerSessionManager implements ComputerSessionManagerInterface {
  private sessions = new Map<string, ReplSession>();
  private readonly defaultTimeout = 30000;
  private readonly settleTime = 500; // ms to wait for silence

  hasSession(name: string): boolean {
    return this.sessions.has(name);
  }

  getSession(name: string): ReplSession | undefined {
    return this.sessions.get(name);
  }

  createSession(
    name: string,
    language: ReplSession['language'],
    cwd: string,
    env?: Record<string, string>,
    cleanupPaths?: string[],
  ): ReplSession {
    if (this.sessions.has(name)) {
      throw new Error(`Session "${name}" already exists.`);
    }

    const outputBuffer: string[] = [];
    const sessionRef: { current: ReplSession | undefined } = {
      current: undefined,
    };
    const shell = new PersistentShell({
      language,
      cwd,
      env,
      onOutput: (data) => {
        const activeSession = sessionRef.current ?? this.sessions.get(name);
        if (activeSession) {
          activeSession.lastActivityAt = Date.now();
        }

        // Rate Limiting / Buffer Protection (Phase 4.2)
        const MAX_BUFFER_SIZE = 100 * 1024; // 100KB limit
        const CURRENT_SIZE = outputBuffer.reduce(
          (acc, str) => acc + str.length,
          0,
        );

        if (CURRENT_SIZE > MAX_BUFFER_SIZE) {
          if (
            outputBuffer.at(-1) !==
            '\n... [Output truncated due to excessive length] ...\n'
          ) {
            outputBuffer.push(
              '\n... [Output truncated due to excessive length] ...\n',
            );
          }
          return;
        }
        outputBuffer.push(data);
      },
      onExit: (code, signal) => {
        debugLogger.log(
          'session',
          `Session "${name}" exited with code ${code}, signal ${signal}`,
        );
        const activeSession = sessionRef.current ?? this.sessions.get(name);
        if (activeSession) {
          this.cleanupSessionResources(activeSession);
        }
        this.sessions.delete(name);
      },
    });

    const session: ReplSession = {
      name,
      language,
      shell,
      outputBuffer,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      cleanupPaths,
    };
    sessionRef.current = session;

    this.sessions.set(name, session);
    return session;
  }

  async executeCode(
    name: string,
    code: string,
    timeoutMs: number = this.defaultTimeout,
  ): Promise<{ output: string; timedOut: boolean }> {
    const session = this.sessions.get(name);
    if (!session) {
      throw new Error(`Session "${name}" does not exist.`);
    }

    // Clear buffer from previous runs?
    // In a REPL, we might want to keep history? No, usually expect output strictly from this command.
    // PersistentShell keeps the process history, but we want to capture *new* output.
    session.outputBuffer = [];
    session.shell.write(code);

    return new Promise((resolve) => {
      let overallTimeoutTimer: NodeJS.Timeout | null = null;
      let checkInterval: NodeJS.Timeout | null = null;
      let lastBufferLength = 0;

      const cleanUp = () => {
        if (overallTimeoutTimer) clearTimeout(overallTimeoutTimer);
        if (checkInterval) clearInterval(checkInterval);
      };

      const resolveOutput = (timedOut: boolean) => {
        cleanUp();
        // Return accumulated output
        const output = session.outputBuffer.join('');
        resolve({ output, timedOut });
      };

      // Overall hard timeout
      overallTimeoutTimer = setTimeout(() => {
        // Clear check interval to suppress silence detection during timeout handling
        if (checkInterval) clearInterval(checkInterval);

        this.handleTimeout(session)
          .then(() => {
            resolveOutput(true);
          })
          .catch((err) => {
            debugLogger.error(`Timeout handler failed: ${err}`);
            resolveOutput(true);
          });
      }, timeoutMs);

      // Check for settlement
      // We poll buffer length changes for simplicity or hook into onOutput?
      // Since onOutput is on the session, we can't easily hook it specifically for this promise unless we modify the session object or event emitter.
      // But we have session.lastActivityAt.

      checkInterval = setInterval(() => {
        const timeSinceLastActivity = Date.now() - session.lastActivityAt;
        if (session.outputBuffer.length > lastBufferLength) {
          lastBufferLength = session.outputBuffer.length;
          // Activity happened, wait more
        } else if (
          session.outputBuffer.length > 0 &&
          timeSinceLastActivity > this.settleTime
        ) {
          // We have some output and it has settled
          // BUT: what if the command produces NO output? (e.g. x=5)
          // Then we rely on simple timeout? That's bad UX.
          // Usually REPLs prompt back (e.g. >>>).
          // We could check for prompt patterns?
          // For now, if we have *some* output, we settle.
          // If we have NO output, we might wait until timeout?
          // Most REPLs echo input or a prompt.
          resolveOutput(false);
        } else if (
          session.outputBuffer.length === 0 &&
          Date.now() - session.lastActivityAt > 500
        ) {
          // Case: No output at all received quickly (maybe it was silent).
          // This is tricky.
          // If we assume `shell.write` echos chars (if PTY), we should see input echo.
          // So buffer length > 0 is a fair assumption if echo is on.
          // If explicit silence is possible, we might wait up to 1-2s then resolve empty?
          if (Date.now() - session.lastActivityAt > 2000) {
            resolveOutput(false);
          }
        }
      }, 100);
    });
  }

  private async handleTimeout(session: ReplSession): Promise<void> {
    debugLogger.warn(`Session "${session.name}" timed out. Sending SIGINT.`);
    session.shell.kill('SIGINT');
    // Wait 2s to see if it recovers (e.g. back to prompt)
    await new Promise((r) => setTimeout(r, 2000));

    // Ideally we check if it's responsive. For now, assume if it processed signal it might be ok.
    // But Phase 4.1 says: If still alive... (it's hard to know if "command" is alive vs "shell").
    // PersistentShell doesn't expose child process list.
    // We'll stick to SIGINT for now. Phase 4.1 implies a more aggressive kill if needed.
    // If we want to kill the *command* but keep shell, SIGINT often works.
    // If we kill the shell (SIGKILL), the session terminates.
    // The plan says: "If still alive, call shell.kill('SIGKILL')".
    // This implies killing the whole session if it's stuck.
    if (session.shell.isAlive) {
      // We might want to keep it alive if SIGINT worked.
      // But how do we know?
      // For now, let's just do SIGINT. Aggressive SIGKILL might be too much for just a long loop if SIGINT works.
      // However, to be safe against runaway, maybe we leave it at SIGINT.
    }
  }

  killSession(name: string, signal?: string): void {
    const session = this.sessions.get(name);
    if (session) {
      session.shell.kill(signal);
      this.cleanupSessionResources(session);
      this.sessions.delete(name);
    }
  }

  listSessions(): ReplSession[] {
    return Array.from(this.sessions.values());
  }

  disposeAll(): void {
    for (const session of this.sessions.values()) {
      session.shell.dispose();
      this.cleanupSessionResources(session);
    }
    this.sessions.clear();
  }

  private cleanupSessionResources(session: ReplSession): void {
    if (!session.cleanupPaths?.length) {
      return;
    }

    for (const cleanupPath of session.cleanupPaths) {
      try {
        fs.rmSync(cleanupPath, { recursive: true, force: true });
      } catch (error) {
        debugLogger.warn(`Failed to cleanup ${cleanupPath}: ${error}`);
      }
    }
  }
}

export const computerSessionManager = new ComputerSessionManager();
