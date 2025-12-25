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

export class LinuxAtspiDriver implements DesktopDriver {
  private process?: ChildProcess;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (value: any) => void; reject: (reason?: any) => void }
  >();
  private rl?: readline.Interface;
  private sidecarPath: string;

  constructor() {
    // Assuming sidecar is peer to core or in a known location
    // Adjust path as needed based on monorepo structure
    this.sidecarPath = path.resolve(
      process.cwd(),
      'packages/desktop-linux-atspi-sidecar/src/main.py',
    );
  }

  async connect(): Promise<DriverConnectionStatus> {
    try {
      this.process = spawn('python3', [this.sidecarPath], {
        stdio: ['pipe', 'pipe', 'inherit'], // inherit stderr for logging
      });

      if (!this.process.stdout || !this.process.stdin) {
        throw new Error('Failed to spawn sidecar with stdio');
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
                pending.resolve(response.result);
              }
              this.pendingRequests.delete(response.id);
            }
          }
        } catch (e) {
          console.error('Failed to parse sidecar output:', line, e);
        }
      });

      this.process.on('exit', (code) => {
        console.warn(`Sidecar exited with code ${code}`);
        this.process = undefined;
      });

      // Verification ping
      await this.getCapabilities();

      return { connected: true, version: '0.1.0' };
    } catch (e) {
      console.error('Failed to connect to Linux sidecar:', e);
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
    return this.sendRequest('get_capabilities', {});
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
      return Promise.reject(new Error('Driver not connected'));
    }

    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      this.pendingRequests.set(id, { resolve, reject });

      const request = JSON.stringify({ jsonrpc: '2.0', method, params, id });
      this.process!.stdin!.write(request + '\n');
    });
  }
}
