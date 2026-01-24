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
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { EventEmitter } from 'node:events';
import {
  BrokerRequestSchema,
  BrokerResponseSchema,
  type BrokerRequest,
  type BrokerResponse,
  createErrorResponse,
  createSuccessResponse,
} from './BrokerSchema.js';
import {
  createSecurePipeServer,
  ensureAppContainerProfile,
  getAppContainerSid,
} from './native.js';

// Well-known SID for "ALL APPLICATION PACKAGES" (AppContainers)
const ALL_APP_PACKAGES_SID = 'S-1-15-2-1';

export interface BrokerServerOptions {
  /** Session-unique identifier for pipe name */
  sessionId?: string;
  /** Path to workspace directory for ACL granting */
  workspacePath: string;
  /** Whether to run Node.js permission check on startup */
  checkNodePermissions?: boolean;
  /** Handshake token required from client */
  handshakeToken: string;
  /** AppContainer SID for pipe ACL */
  appContainerSid?: string;
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
  private securePipe: ReturnType<typeof createSecurePipeServer> | null = null;
  private fallbackServer: net.Server | null = null;
  private readonly sessionId: string;
  private readonly pipePath: string;

  private readonly checkNodePermissions: boolean;
  private readonly handshakeToken: string;
  private readonly appContainerSid?: string;
  private isRunning = false;
  private handshakeComplete = false;

  constructor(options: BrokerServerOptions) {
    super();
    this.sessionId = options.sessionId ?? randomUUID();
    this.pipePath = `\\\\.\\pipe\\terminai-${this.sessionId}`;

    this.checkNodePermissions = options.checkNodePermissions ?? true;
    this.handshakeToken = options.handshakeToken;
    this.appContainerSid = options.appContainerSid;
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

    const sid =
      this.appContainerSid ||
      ensureAppContainerProfile() ||
      getAppContainerSid();

    if (sid) {
      this.securePipe = createSecurePipeServer(this.pipePath, sid);
      this.securePipe.listen();
      this.isRunning = true;
      this.emit('connection', this.sessionId);

      this.handlePipeLoop().catch((error) => {
        this.emit('error', error);
      });
      return;
    }

    if (process.env['TERMINAI_UNSAFE_OPEN_PIPE'] === '1') {
      await this.startOpenPipe();
      return;
    }

    throw new Error('AppContainer SID not available');
  }

  /**
   * Whether a secure AppContainer-restricted pipe is active.
   */
  get isSecure(): boolean {
    return this.securePipe !== null && this.fallbackServer === null;
  }

  private async startOpenPipe(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.fallbackServer = net.createServer((socket) => {
        this.handleFallbackConnection(socket);
      });

      this.fallbackServer.on('error', (error) => {
        this.emit('error', error);
        if (!this.isRunning) {
          reject(error);
        }
      });

      this.fallbackServer.on('close', () => {
        this.isRunning = false;
        this.emit('close');
      });

      this.fallbackServer.listen(this.pipePath, () => {
        this.isRunning = true;
        resolve();
      });
    });
  }

  private async handlePipeLoop(): Promise<void> {
    if (!this.securePipe) {
      return;
    }

    while (this.isRunning) {
      try {
        this.handshakeComplete = false;
        await this.securePipe.acceptConnection();
        let buffer = '';

        while (this.isRunning && this.securePipe.isConnected()) {
          const chunk = await this.securePipe.read();
          buffer += chunk;

          const messages = buffer.split('\n');
          buffer = messages.pop() ?? '';

          for (const message of messages) {
            if (!message.trim()) continue;
            await this.handleMessage(message);
          }
        }
      } catch (error) {
        this.emit('error', error as Error);
      }
    }
  }

  private async handleMessage(message: string): Promise<void> {
    if (!this.securePipe) {
      return;
    }

    try {
      const parsed = JSON.parse(message);
      const validated = BrokerRequestSchema.parse(parsed);

      if (!this.handshakeComplete) {
        if (validated.type !== 'hello') {
          await this.writeResponse(
            createErrorResponse(
              validated.id,
              'Handshake required',
              'HANDSHAKE_REQUIRED',
            ),
          );
          return;
        }

        const tokenOk =
          validated.token.length === this.handshakeToken.length &&
          timingSafeEqual(
            Buffer.from(validated.token),
            Buffer.from(this.handshakeToken),
          );

        if (!tokenOk) {
          await this.writeResponse(
            createErrorResponse(
              validated.id,
              'Handshake failed',
              'HANDSHAKE_FAILED',
            ),
          );
          return;
        }

        this.handshakeComplete = true;
        await this.writeResponse(
          createSuccessResponse(validated.id, {
            sessionId: this.sessionId,
            connectedAt: new Date().toISOString(),
          }),
        );
        return;
      }

      if (validated.type === 'hello') {
        await this.writeResponse(
          createSuccessResponse(validated.id, {
            sessionId: this.sessionId,
            connectedAt: new Date().toISOString(),
          }),
        );
        return;
      }

      this.emit('request', validated, async (response: BrokerResponse) => {
        const validatedResponse = BrokerResponseSchema.parse(response);
        await this.writeResponse(validatedResponse);
      });
    } catch (error) {
      const requestId = randomUUID();
      const errorResponse = createErrorResponse(
        requestId,
        `Invalid request: ${(error as Error).message}`,
        'INVALID_REQUEST',
      );
      await this.writeResponse(errorResponse);
    }
  }

  private handleFallbackConnection(socket: net.Socket): void {
    let buffer = '';
    this.handshakeComplete = false;

    socket.on('data', async (data) => {
      buffer += data.toString('utf-8');
      const messages = buffer.split('\n');
      buffer = messages.pop() ?? '';

      for (const message of messages) {
        if (!message.trim()) continue;
        try {
          const parsed = JSON.parse(message);
          const validated = BrokerRequestSchema.parse(parsed);

          if (!this.handshakeComplete) {
            if (validated.type !== 'hello') {
              const response = createErrorResponse(
                validated.id,
                'Handshake required',
                'HANDSHAKE_REQUIRED',
              );
              socket.write(JSON.stringify(response) + '\n');
              continue;
            }

            const tokenOk =
              validated.token.length === this.handshakeToken.length &&
              timingSafeEqual(
                Buffer.from(validated.token),
                Buffer.from(this.handshakeToken),
              );

            if (!tokenOk) {
              const response = createErrorResponse(
                validated.id,
                'Handshake failed',
                'HANDSHAKE_FAILED',
              );
              socket.write(JSON.stringify(response) + '\n');
              continue;
            }

            this.handshakeComplete = true;
            const response = createSuccessResponse(validated.id, {
              sessionId: this.sessionId,
              connectedAt: new Date().toISOString(),
            });
            socket.write(JSON.stringify(response) + '\n');
            continue;
          }

          this.emit('request', validated, async (response: BrokerResponse) => {
            const validatedResponse = BrokerResponseSchema.parse(response);
            socket.write(JSON.stringify(validatedResponse) + '\n');
          });
        } catch (error) {
          const response = createErrorResponse(
            randomUUID(),
            `Invalid request: ${(error as Error).message}`,
            'INVALID_REQUEST',
          );
          socket.write(JSON.stringify(response) + '\n');
        }
      }
    });

    socket.on('error', (error) => {
      this.emit('error', error);
    });
  }

  private async writeResponse(response: BrokerResponse): Promise<void> {
    if (!this.securePipe) {
      return;
    }
    await this.securePipe.write(`${JSON.stringify(response)}\n`);
  }

  /**
   * Stop the Named Pipe server.
   */
  async stop(): Promise<void> {
    if (this.securePipe) {
      this.securePipe.close();
      this.securePipe = null;
    }
    if (this.fallbackServer) {
      this.fallbackServer.close();
      this.fallbackServer = null;
    }
    this.isRunning = false;
    this.emit('close');
  }

  /**
   * Check if the server is currently running.
   */
  get running(): boolean {
    return this.isRunning;
  }

  get hasHandshake(): boolean {
    return this.handshakeComplete;
  }
}
