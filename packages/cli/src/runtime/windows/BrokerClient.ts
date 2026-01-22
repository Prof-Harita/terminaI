/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Task 45: BrokerClient for Brain Process
 *
 * This module implements the client side of the Named Pipe IPC channel.
 * It runs inside the "Brain" process (AppContainer sandbox) and communicates
 * with "The Hands" (privileged Broker) to perform privileged operations.
 *
 * The BrokerClient:
 * - Connects to the Named Pipe created by BrokerServer
 * - Sends JSON-RPC style requests
 * - Receives and parses responses
 * - Handles connection loss gracefully
 *
 * @see docs-terminai/architecture-sovereign-runtime.md Appendix M
 */

import * as net from 'node:net';
import { EventEmitter } from 'node:events';
import {
  BrokerRequestSchema,
  BrokerResponseSchema,
  type BrokerRequest,
  type BrokerResponse,
  isErrorResponse,
} from './BrokerSchema.js';

export interface BrokerClientOptions {
  /** Named Pipe path (e.g., \\.\pipe\terminai-{sessionId}) */
  pipePath: string;
  /** Connection timeout in milliseconds (default: 5000) */
  connectTimeout?: number;
  /** Request timeout in milliseconds (default: 30000) */
  requestTimeout?: number;
  /** Whether to auto-reconnect on connection loss */
  autoReconnect?: boolean;
}

export interface BrokerClientEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  reconnecting: (attempt: number) => void;
}

/**
 * BrokerClient provides the IPC interface for the sandboxed Brain process.
 *
 * Usage:
 * ```typescript
 * const client = new BrokerClient({ pipePath: '\\\\.\\pipe\\terminai-xxx' });
 * await client.connect();
 *
 * // Execute a command
 * const result = await client.execute('python', ['script.py']);
 *
 * // Read a file
 * const content = await client.readFile('config.json');
 *
 * // Disconnect when done
 * await client.disconnect();
 * ```
 */
export class BrokerClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private readonly pipePath: string;
  private readonly connectTimeout: number;
  private readonly requestTimeout: number;
  private readonly autoReconnect: boolean;

  private isConnected = false;
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private pendingRequests = new Map<
    number,
    {
      resolve: (response: BrokerResponse) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  private requestCounter = 0;
  private responseBuffer = '';

  constructor(options: BrokerClientOptions) {
    super();
    this.pipePath = options.pipePath;
    this.connectTimeout = options.connectTimeout ?? 5000;
    this.requestTimeout = options.requestTimeout ?? 30000;
    this.autoReconnect = options.autoReconnect ?? true;
  }

  /**
   * Check if the client is connected.
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Connect to the Broker server.
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Connection timeout after ${this.connectTimeout}ms`));
      }, this.connectTimeout);

      this.socket = net.createConnection(this.pipePath, () => {
        clearTimeout(timeoutId);
        this.isConnected = true;
        this.reconnectAttempt = 0;
        this.emit('connected');
        resolve();
      });

      this.socket.on('data', (data: Buffer | string) => {
        const buffer =
          typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
        this.handleData(buffer);
      });

      this.socket.on('error', (error) => {
        clearTimeout(timeoutId);
        this.emit('error', error);
        if (!this.isConnected) {
          reject(error);
        }
      });

      this.socket.on('close', () => {
        this.isConnected = false;
        this.socket = null;
        this.emit('disconnected');

        // Reject all pending requests
        for (const [, pending] of this.pendingRequests) {
          clearTimeout(pending.timer);
          pending.reject(new Error('Connection closed'));
        }
        this.pendingRequests.clear();

        // Auto-reconnect if enabled
        if (
          this.autoReconnect &&
          this.reconnectAttempt < this.maxReconnectAttempts
        ) {
          this.scheduleReconnect();
        }
      });
    });
  }

  /**
   * Schedule a reconnection attempt.
   */
  private scheduleReconnect(): void {
    this.reconnectAttempt++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempt - 1);

    this.emit('reconnecting', this.reconnectAttempt);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error(
          `[BrokerClient] Reconnect attempt ${this.reconnectAttempt} failed:`,
          (error as Error).message,
        );
      }
    }, delay);
  }

  /**
   * Handle incoming data from the socket.
   */
  private handleData(data: Buffer): void {
    this.responseBuffer += data.toString('utf-8');

    // Process complete JSON messages (newline-delimited)
    const messages = this.responseBuffer.split('\n');
    this.responseBuffer = messages.pop() ?? '';

    for (const message of messages) {
      if (!message.trim()) continue;

      try {
        const parsed = JSON.parse(message);
        const response = BrokerResponseSchema.parse(parsed);

        // Match response to pending request
        // For now, we use a simple FIFO approach
        // In a real implementation, we'd include a request ID
        const [firstId] = this.pendingRequests.keys();
        if (firstId !== undefined) {
          const pending = this.pendingRequests.get(firstId);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingRequests.delete(firstId);
            pending.resolve(response);
          }
        }
      } catch (error) {
        console.error('[BrokerClient] Failed to parse response:', error);
      }
    }
  }

  /**
   * Send a request to the Broker.
   */
  private async sendRequest(request: BrokerRequest): Promise<BrokerResponse> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to Broker');
    }

    // Validate request
    BrokerRequestSchema.parse(request);

    return new Promise((resolve, reject) => {
      const id = ++this.requestCounter;

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout after ${this.requestTimeout}ms`));
      }, this.requestTimeout);

      this.pendingRequests.set(id, { resolve, reject, timer });

      // Send request as newline-delimited JSON
      this.socket!.write(JSON.stringify(request) + '\n');
    });
  }

  /**
   * Disconnect from the Broker.
   */
  async disconnect(): Promise<void> {
    this.autoReconnect && (this.maxReconnectAttempts = 0); // Disable reconnect

    if (this.socket) {
      return new Promise((resolve) => {
        this.socket!.once('close', resolve);
        this.socket!.end();
      });
    }
  }

  // ============================================================================
  // High-Level API Methods
  // ============================================================================

  /**
   * Ping the Broker to verify connectivity.
   */
  async ping(): Promise<{ pong: boolean; timestamp: number }> {
    const response = await this.sendRequest({ type: 'ping' });
    if (isErrorResponse(response)) {
      throw new Error(response.error);
    }
    return response.data as { pong: boolean; timestamp: number };
  }

  /**
   * Execute a command.
   */
  async execute(
    command: string,
    args?: string[],
    options?: {
      cwd?: string;
      env?: Record<string, string>;
      timeout?: number;
    },
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
    timedOut?: boolean;
  }> {
    const response = await this.sendRequest({
      type: 'execute',
      command,
      args,
      cwd: options?.cwd,
      env: options?.env,
      timeout: options?.timeout,
    });

    if (isErrorResponse(response)) {
      throw new Error(response.error);
    }

    return response.data as {
      exitCode: number;
      stdout: string;
      stderr: string;
      timedOut?: boolean;
    };
  }

  /**
   * Read a file.
   */
  async readFile(
    filePath: string,
    encoding: 'utf-8' | 'base64' = 'utf-8',
  ): Promise<string> {
    const response = await this.sendRequest({
      type: 'readFile',
      path: filePath,
      encoding,
    });

    if (isErrorResponse(response)) {
      throw new Error(response.error);
    }

    return response.data as string;
  }

  /**
   * Write a file.
   */
  async writeFile(
    filePath: string,
    content: string,
    options?: {
      encoding?: 'utf-8' | 'base64';
      createDirs?: boolean;
    },
  ): Promise<void> {
    const response = await this.sendRequest({
      type: 'writeFile',
      path: filePath,
      content,
      encoding: options?.encoding,
      createDirs: options?.createDirs,
    });

    if (isErrorResponse(response)) {
      throw new Error(response.error);
    }
  }

  /**
   * List directory contents.
   */
  async listDir(
    dirPath: string,
    includeHidden = false,
  ): Promise<
    Array<{
      name: string;
      isDirectory: boolean;
      size?: number;
      modified?: string;
    }>
  > {
    const response = await this.sendRequest({
      type: 'listDir',
      path: dirPath,
      includeHidden,
    });

    if (isErrorResponse(response)) {
      throw new Error(response.error);
    }

    return response.data as Array<{
      name: string;
      isDirectory: boolean;
      size?: number;
      modified?: string;
    }>;
  }

  /**
   * Execute a PowerShell script (with AMSI scan).
   */
  async powershell(
    script: string,
    options?: {
      cwd?: string;
      timeout?: number;
    },
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const response = await this.sendRequest({
      type: 'powershell',
      script,
      cwd: options?.cwd,
      timeout: options?.timeout,
    });

    if (isErrorResponse(response)) {
      throw new Error(response.error);
    }

    return response.data as {
      exitCode: number;
      stdout: string;
      stderr: string;
    };
  }

  /**
   * Scan content for malware using AMSI.
   */
  async amsiScan(
    content: string,
    filename: string,
  ): Promise<{ clean: boolean; result: number; description?: string }> {
    const response = await this.sendRequest({
      type: 'amsiScan',
      content,
      filename,
    });

    if (isErrorResponse(response)) {
      throw new Error(response.error);
    }

    return response.data as {
      clean: boolean;
      result: number;
      description?: string;
    };
  }
}
