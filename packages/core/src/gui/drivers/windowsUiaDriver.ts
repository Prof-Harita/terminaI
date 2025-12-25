/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import * as readline from 'node:readline';
import type {
  DesktopDriver,
  DriverConnectionStatus,
  DriverHealth,
} from './types.js';
import type {
  DriverCapabilities,
  VisualDOMSnapshot,
  UiActionResult,
} from '../protocol/types.js';
import type {
  UiClickArgs,
  UiTypeArgs,
  UiKeyArgs,
  UiScrollArgs,
  UiFocusArgs,
  UiClickXyArgs,
  UiSnapshotArgs,
} from '../protocol/schemas.js';

export class WindowsUiaDriver implements DesktopDriver {
  readonly name = 'windows-uia';
  readonly kind = 'native';
  readonly version = '1.0.0';

  private process?: ChildProcess;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();
  private rl?: readline.Interface;
  private binaryPath: string;

  constructor() {
    this.binaryPath = path.resolve(
      process.cwd(),
      'packages/desktop-windows-driver/target/release/desktop-windows-driver.exe',
    );
  }

  async connect(): Promise<DriverConnectionStatus> {
    try {
      this.process = spawn(this.binaryPath, [], {
        stdio: ['pipe', 'pipe', 'inherit'],
      });

      if (!this.process.stdout || !this.process.stdin) {
        throw new Error('Failed to spawn Windows driver with stdio');
      }

      this.rl = readline.createInterface({
        input: this.process.stdout,
        terminal: false,
      });

      this.rl.on('line', (line) => {
        try {
          const response = JSON.parse(line);
          if (response.id !== undefined) {
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
              if (response.error) {
                pending.reject(new Error(response.error.message));
              } else {
                pending.resolve(response.result); // Cast if necessary or let unknown flow
              }
              this.pendingRequests.delete(response.id);
            }
          }
        } catch (e) {
          console.error('Failed to parse driver output:', line, e);
        }
      });

      this.process.on('exit', (code) => {
        console.warn(`Driver exited with code ${code}`);
        this.process = undefined;
      });

      // Verification ping
      await this.getCapabilities();

      return { connected: true, version: '0.1.0' };
    } catch (e) {
      // In MVP, we might expect this to fail on Linux (obviously) or if binary not built.
      console.warn('Failed to connect to Windows driver:', e);
      return { connected: false, error: String(e) };
    }
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }
  }

  async getHealth(): Promise<DriverHealth> {
    return {
      status: this.process ? 'healthy' : 'unhealthy',
      details: this.process ? 'Process running' : 'Process not running',
    };
  }

  async getCapabilities(): Promise<DriverCapabilities> {
    try {
      const caps = await this.sendRequest<DriverCapabilities>(
        'get_capabilities',
        {},
      );
      return caps;
    } catch {
      // Fallback: return a properly-shaped capabilities object for Windows
      return {
        canSnapshot: false,
        canClick: false,
        canType: false,
        canScroll: false,
        canKey: false,
        canOcr: false,
        canScreenshot: false,
        canInjectInput: false,
      };
    }
  }

  async snapshot(args: UiSnapshotArgs): Promise<VisualDOMSnapshot> {
    return this.sendRequest('snapshot', args);
  }

  async click(args: UiClickArgs): Promise<UiActionResult> {
    return this.sendRequest('click', args);
  }

  async type(args: UiTypeArgs): Promise<UiActionResult> {
    return this.sendRequest('type', args);
  }

  async key(args: UiKeyArgs): Promise<UiActionResult> {
    return this.sendRequest('key', args);
  }

  async scroll(args: UiScrollArgs): Promise<UiActionResult> {
    return this.sendRequest('scroll', args);
  }

  async focus(args: UiFocusArgs): Promise<UiActionResult> {
    return this.sendRequest('focus', args);
  }

  async clickXy(args: UiClickXyArgs): Promise<UiActionResult> {
    return this.sendRequest('click_xy', args);
  }

  private sendRequest<T>(
    method: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    if (!this.process || !this.process.stdin) {
      // Fallback or error?
      return Promise.reject(new Error('Driver not connected'));
    }

    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      // @ts-expect-error Map stores unknown resolver, T is known here.
      this.pendingRequests.set(id, { resolve, reject });

      const request = JSON.stringify({ jsonrpc: '2.0', method, params, id });
      this.process!.stdin!.write(request + '\n');
    });
  }
}
