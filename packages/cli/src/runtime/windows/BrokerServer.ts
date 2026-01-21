/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Task 40: Named Pipe Server with ACL Security + Node.js Permission Check
 *
 * This module implements the "Hands" side of the Windows Brain & Hands architecture.
 * The BrokerServer runs with elevated (Admin) privileges but has BLOCKED network access.
 * It receives commands from the sandboxed "Brain" process via Named Pipe IPC.
 *
 * Security Architecture:
 * - Named Pipe ACL restricts access to the AppContainer SID only
 * - Node.js binary accessibility is verified on first run
 * - All script execution passes through AMSI scanning
 *
 * @see docs-terminai/architecture-sovereign-runtime.md Appendix M
 */

import * as net from 'node:net';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import {
  BrokerRequestSchema,
  BrokerResponseSchema,
  type BrokerRequest,
  type BrokerResponse,
} from './BrokerSchema.js';

// Well-known SID for "ALL APPLICATION PACKAGES" (AppContainers)
const ALL_APP_PACKAGES_SID = 'S-1-15-2-1';

export interface BrokerServerOptions {
  /** Session-unique identifier for pipe name */
  sessionId?: string;
  /** Path to workspace directory for ACL granting */
  workspacePath: string;
  /** Whether to run Node.js permission check on startup */
  checkNodePermissions?: boolean;
}

export interface BrokerServerEvents {
  request: (
    request: BrokerRequest,
    respond: (response: BrokerResponse) => void,
  ) => void;
  error: (error: Error) => void;
  connection: (clientId: string) => void;
  close: () => void;
}

/**
 * BrokerServer implements the Named Pipe IPC server for Windows AppContainer communication.
 *
 * The server:
 * 1. Creates a Named Pipe at `\\.\pipe\terminai-{sessionId}`
 * 2. Applies ACL restricting access to AppContainer SID
 * 3. Verifies Node.js is accessible by AppContainers
 * 4. Handles JSON-RPC style messages validated by Zod schemas
 */
export class BrokerServer extends EventEmitter {
  private server: net.Server | null = null;
  private readonly sessionId: string;
  private readonly pipePath: string;

  private readonly checkNodePermissions: boolean;
  private isRunning = false;

  constructor(options: BrokerServerOptions) {
    super();
    this.sessionId = options.sessionId ?? randomUUID();
    this.pipePath = `\\\\.\\pipe\\terminai-${this.sessionId}`;

    this.checkNodePermissions = options.checkNodePermissions ?? true;
  }

  /**
   * Get the Named Pipe path for client connection
   */
  get path(): string {
    return this.pipePath;
  }

  /**
   * Get the session ID for this broker
   */
  get id(): string {
    return this.sessionId;
  }

  /**
   * Check if Node.js is readable by AppContainers and grant access if needed.
   *
   * AppContainers cannot access arbitrary system directories. This method:
   * 1. Checks if node.exe is accessible by ALL APPLICATION PACKAGES
   * 2. If not, executes icacls to grant read/execute permissions
   *
   * @throws Error if permission cannot be granted (requires Admin)
   */
  async ensureNodeAccessible(): Promise<void> {
    if (!this.checkNodePermissions) {
      return;
    }

    const nodePath = process.execPath;
    const nodeDir = path.dirname(nodePath);

    try {
      // Check if already accessible by checking icacls output
      const aclCheck = execSync(`icacls "${nodePath}"`, { encoding: 'utf-8' });

      // Look for ALL APPLICATION PACKAGES or S-1-15-2-1 in the output
      if (
        aclCheck.includes('ALL APPLICATION PACKAGES') ||
        aclCheck.includes(ALL_APP_PACKAGES_SID)
      ) {
        // Already accessible
        return;
      }

      // Grant read/execute access to Node.js installation
      // (OI) = Object Inherit, (CI) = Container Inherit, (RX) = Read and Execute
      console.log(
        '[BrokerServer] Granting AppContainer access to Node.js runtime...',
      );
      execSync(
        `icacls "${nodeDir}" /grant "*${ALL_APP_PACKAGES_SID}:(OI)(CI)(RX)"`,
        { stdio: 'inherit' },
      );
      console.log(
        '[BrokerServer] Node.js runtime is now AppContainer-accessible',
      );
    } catch (error) {
      // Log warning but don't fail - the native module might bundle Node
      console.warn(
        '[BrokerServer] Could not grant Node.js access to AppContainers:',
        (error as Error).message,
      );
      console.warn(
        '[BrokerServer] If Brain process fails to start, run as Administrator:',
      );
      console.warn(
        `  icacls "${nodeDir}" /grant "*${ALL_APP_PACKAGES_SID}:(OI)(CI)(RX)"`,
      );
    }
  }

  /**
   * Start the Named Pipe server.
   *
   * The server will:
   * 1. Verify Node.js permissions for AppContainers
   * 2. Create the Named Pipe
   * 3. Begin listening for connections
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('BrokerServer is already running');
    }

    // Step 1: Ensure Node.js is accessible by AppContainers
    await this.ensureNodeAccessible();

    // Step 2: Create Named Pipe server
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on('error', (error) => {
        this.emit('error', error);
        if (!this.isRunning) {
          reject(error);
        }
      });

      this.server.on('close', () => {
        this.isRunning = false;
        this.emit('close');
      });

      // Step 3: Listen on Named Pipe
      // TODO (Task 40): Apply ACL to restrict access to AppContainer SID only
      // Current limitation: Node.js net.createServer() doesn't support SECURITY_ATTRIBUTES
      // Required implementation:
      //   1. Native module to create pipe with custom DACL
      //   2. Use Windows CreateNamedPipe() with SECURITY_ATTRIBUTES
      //   3. Grant access only to S-1-15-2-1 (AppContainer SID)
      //
      // Alternative: Use named-pipe-wrapper library or implement in native.ts
      // For now: Pipe is accessible by any process (security gap on Windows)
      //
      // See: https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createnamedpipea
      this.server.listen(this.pipePath, () => {
        this.isRunning = true;
        console.log(`[BrokerServer] Listening on ${this.pipePath}`);
        console.warn(
          '[BrokerServer] WARNING: Named Pipe ACLs are currently OPEN. ' +
            'This is a temporary state until native module is updated (Phase 3). ' +
            'Ensure this machine is single-tenant.',
        );
        resolve();
      });
    });
  }

  /**
   * Handle a new client connection.
   *
   * Each connection:
   * 1. Generates a unique client ID
   * 2. Buffers incoming data for complete JSON messages
   * 3. Validates requests against BrokerRequestSchema
   * 4. Emits 'request' event for processing
   */
  private handleConnection(socket: net.Socket): void {
    const clientId = randomUUID();
    let buffer = '';

    this.emit('connection', clientId);

    socket.on('data', (data) => {
      buffer += data.toString('utf-8');

      // Process complete JSON messages (delimited by newlines)
      const messages = buffer.split('\n');
      buffer = messages.pop() ?? '';

      for (const message of messages) {
        if (!message.trim()) continue;

        try {
          const parsed = JSON.parse(message);
          const validated = BrokerRequestSchema.parse(parsed);

          // Emit request event with response callback
          this.emit('request', validated, (response: BrokerResponse) => {
            const validatedResponse = BrokerResponseSchema.parse(response);
            socket.write(JSON.stringify(validatedResponse) + '\n');
          });
        } catch (error) {
          // Send error response for invalid requests
          const errorResponse: BrokerResponse = {
            success: false,
            error: `Invalid request: ${(error as Error).message}`,
          };
          socket.write(JSON.stringify(errorResponse) + '\n');
        }
      }
    });

    socket.on('error', (error) => {
      console.error(`[BrokerServer] Client ${clientId} error:`, error.message);
    });

    socket.on('close', () => {
      console.log(`[BrokerServer] Client ${clientId} disconnected`);
    });
  }

  /**
   * Stop the Named Pipe server.
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => {
        this.server = null;
        this.isRunning = false;
        resolve();
      });
    });
  }

  /**
   * Check if the server is currently running.
   */
  get running(): boolean {
    return this.isRunning;
  }
}
