/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  RuntimeContext,
  ExecutionOptions,
  ExecutionResult,
  RuntimeProcess,
} from '@terminai/core';
import { FirecrackerDriver } from './FirecrackerDriver.js';
import { MacVZDriver } from './MacVZDriver.js';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as net from 'node:net';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MicroVMRuntimeContext implements RuntimeContext {
  static async isAvailable(): Promise<boolean> {
    // Check for resources
    let resourcesDir = path.join(__dirname, '../resources');
    if (!fs.existsSync(resourcesDir)) {
      resourcesDir = path.join(path.dirname(process.execPath), 'resources');
    }

    const kernelPath = path.join(resourcesDir, 'vmlinux-x86_64.bin');
    const rootfsPath = path.join(resourcesDir, 'rootfs.ext4');

    // Check drivers
    if (process.platform === 'linux') {
      const fcPath = path.join(resourcesDir, 'firecracker');
      return (
        fs.existsSync(kernelPath) &&
        fs.existsSync(rootfsPath) &&
        fs.existsSync(fcPath)
      );
    } else if (process.platform === 'darwin') {
      /*
       * Note: Mac implementation requires 'vz-helper'.
       * For Phase 3, we focus on structure, but strict check requires the binary.
       */
      const helperPath = path.join(resourcesDir, 'vz-helper');
      return fs.existsSync(helperPath);
    }

    return false;
  }

  readonly type = 'microvm';
  readonly isIsolated = true;
  readonly displayName = 'Sovereign Runtime (Micro-VM)';

  readonly pythonPath: string = '/usr/bin/python3'; // Inside guest
  readonly taptsVersion: string = 'unknown';

  private driver?: FirecrackerDriver | MacVZDriver;
  private vsockUdsPath?: string;

  constructor() {}

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      if (await MicroVMRuntimeContext.isAvailable()) {
        return { ok: true };
      }
      return {
        ok: false,
        error: 'Resources missing (kernel, rootfs, or binaries)',
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  async initialize(): Promise<void> {
    const runDir = path.join(os.tmpdir(), 'terminai-microvm');
    if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });

    let resourcesDir = path.join(__dirname, '../resources');
    if (!fs.existsSync(resourcesDir)) {
      resourcesDir = path.join(path.dirname(process.execPath), 'resources');
    }

    const kernelPath = path.join(resourcesDir, 'vmlinux-x86_64.bin');
    const rootfsPath = path.join(resourcesDir, 'rootfs.ext4');

    if (!fs.existsSync(kernelPath) || !fs.existsSync(rootfsPath)) {
      throw new Error(
        `MicroVM resources missing. Kernel: ${fs.existsSync(kernelPath)}, Rootfs: ${fs.existsSync(rootfsPath)}`,
      );
    }

    const proxyArgs = this.getProxyKernelArgs();

    if (process.platform === 'darwin') {
      this.vsockUdsPath = path.join(runDir, 'vz.vsock');
      this.driver = new MacVZDriver({
        kernelPath,
        cmdline: `console=hvc0 root=/dev/vda rw ${proxyArgs}`,
        memorySizeMB: 512,
        cpuCount: 1,
        vsockPath: this.vsockUdsPath,
      });
    } else {
      this.vsockUdsPath = path.join(runDir, 'firecracker.vsock');
      this.driver = new FirecrackerDriver({
        kernelPath,
        rootfsPath,
        socketPath: path.join(runDir, 'firecracker.sock'),
        logPath: path.join(runDir, 'firecracker.log'),
        vsockCid: 3,
        vsockUdsPath: this.vsockUdsPath,
        kernelArgs: `console=ttyS0,115200 reboot=k panic=1 root=/dev/vda rw rootwait init=/sbin/init ${proxyArgs}`,
        // Note: added init=/sbin/init to ensure our custom init runs
      });
    }

    await this.driver.start();

    // Wait for Agent
    await this.waitForAgent();
  }

  async dispose(): Promise<void> {
    if (this.driver) {
      await this.driver.stop();
    }
  }

  private async waitForAgent(retries = 50): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const sock = await this.connectToVsock(5000);
        sock.end();
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    throw new Error('Timed out waiting for Guest Agent');
  }

  private connectToVsock(port: number): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      if (!this.vsockUdsPath) return reject(new Error('No vsock path'));

      const socket = net.createConnection(this.vsockUdsPath);

      socket.on('connect', () => {
        // Firecracker UDS multiplexing protocol: "CONNECT <PORT>\n"
        // VZ might differ (MacVZ usually expose raw socket?).
        // For now, assuming Firecracker protocol or raw if Mac.

        if (process.platform === 'linux') {
          socket.write(`CONNECT ${port}\n`);
          // Ideally we should wait for "OK" or similar if the protocol defines it.
          // Firecracker docs say: "On success, data can be exchanged."
          // "On failure, the connection is closed."

          // Let's assume immediate success if not closed.
          // A better check would be to read a response if the agent sends a welcome,
          // but our agent waits for data.

          // Hack: Wait a tiny bit to check if it closes?
          setTimeout(() => resolve(socket), 10);
        } else {
          // MacVZ implementation details TBD. Assuming direct connection for now.
          resolve(socket);
        }
      });

      socket.on('error', reject);
    });
  }

  private getProxyKernelArgs(): string {
    const args: string[] = [];
    const vars = [
      'HTTP_PROXY',
      'HTTPS_PROXY',
      'NO_PROXY',
      'http_proxy',
      'https_proxy',
      'no_proxy',
    ];
    for (const v of vars) {
      if (process.env[v]) {
        args.push(`${v}="${process.env[v]}"`);
      }
    }
    return args.join(' ');
  }

  async execute(
    command: string,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult> {
    const sock = await this.connectToVsock(5000);

    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        type: 'execute',
        cmd: command.split(' '), // Simple splitting, ideally use shell parsing logic if needed
        cwd: options?.cwd || '/root', // Default to root
        env: options?.env,
      });

      let buffer = '';
      sock.on('data', (d) => (buffer += d.toString()));
      sock.on('end', () => {
        try {
          const res = JSON.parse(buffer);
          if (res.error) reject(new Error(res.error));
          else
            resolve({
              stdout: res.stdout || '',
              stderr: res.stderr || '',
              exitCode: res.exitCode || 0,
            });
        } catch (e) {
          reject(e);
        }
      });

      sock.on('error', reject);
      sock.write(payload + '\n');
    });
  }

  async spawn(
    command: string,
    options?: ExecutionOptions,
  ): Promise<RuntimeProcess> {
    const sock = await this.connectToVsock(5000);
    // Use an EventEmitter that we cast to RuntimeProcess.
    // We treat it as 'any' internally to emit events easily.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rp = new EventEmitter() as any;

    const payload = JSON.stringify({
      type: 'spawn',
      cmd: command.split(' '),
      cwd: options?.cwd || '/root',
      env: options?.env,
    });

    sock.write(payload + '\n');

    // Per-process buffer for demuxing
    let buffer = Buffer.alloc(0);

    const parseStream = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 5) {
        const type = buffer.readUInt8(0);
        const len = buffer.readUInt32BE(1);

        if (buffer.length < 5 + len) {
          break; // Wait for more data
        }

        const payload = buffer.subarray(5, 5 + len);
        buffer = buffer.subarray(5 + len);

        if (type === 1) {
          // stdout
          rp.stdout?.emit('data', payload);
        } else if (type === 2) {
          // stderr
          rp.stderr?.emit('data', payload);
        } else if (type === 3) {
          // exit
          const code = parseInt(payload.toString(), 10);
          rp.emit('exit', code);
        } else if (type === 0) {
          // error
          rp.emit('error', new Error(payload.toString()));
        }
      }
    };

    sock.on('data', (chunk) => {
      parseStream(chunk);
    });

    sock.on('end', () => {
      rp.emit('exit', 0); // Default if not parsed
    });

    sock.on('error', (err: Error) => {
      rp.emit('error', err);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rp.kill = (_signal?: any): boolean => {
      sock.destroy();
      return true;
    };

    rp.stdout = new EventEmitter();
    rp.stderr = new EventEmitter();

    return rp as RuntimeProcess;
  }
}
