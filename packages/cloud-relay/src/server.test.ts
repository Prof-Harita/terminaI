/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import http from 'node:http';

// Test the relay server behavior by spawning it as a subprocess or mocking
// For unit tests, we'll test the core logic in isolation

describe('Cloud Relay Server', () => {
  let server: http.Server;
  let wss: WebSocketServer;
  let port: number;
  let sessions: Map<
    string,
    { host?: WebSocket; client?: WebSocket; lastActive: number }
  >;
  let connectionsPerIp: Map<string, number>;

  beforeEach(() => {
    sessions = new Map();
    connectionsPerIp = new Map();

    server = http.createServer();
    wss = new WebSocketServer({ server, maxPayload: 1024 * 1024 });

    // Minimal connection handler mimicking server.ts behavior
    wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const role = url.searchParams.get('role');
      const sessionId = url.searchParams.get('session');
      const ip = req.socket.remoteAddress || 'unknown';

      // Rate limit check - track connections
      const currentCount = connectionsPerIp.get(ip) || 0;
      const MAX_CONNECTIONS_PER_IP = 10;

      let counted = false;

      // Register close handler first
      ws.on('close', () => {
        if (counted) {
          const count = connectionsPerIp.get(ip) || 1;
          if (count <= 1) {
            connectionsPerIp.delete(ip);
          } else {
            connectionsPerIp.set(ip, count - 1);
          }
        }
      });

      if (currentCount >= MAX_CONNECTIONS_PER_IP) {
        ws.close(1008, 'Too many connections');
        return;
      }

      connectionsPerIp.set(ip, currentCount + 1);
      counted = true;

      // Validate session
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (
        !sessionId ||
        !uuidRegex.test(sessionId) ||
        (role !== 'host' && role !== 'client')
      ) {
        ws.close(1003, 'Invalid params');
        return;
      }

      // Client role: require existing session
      if (role === 'client') {
        if (!sessions.has(sessionId)) {
          ws.close(1008, 'Unknown session');
          return;
        }
        const session = sessions.get(sessionId)!;
        session.client = ws;
      } else {
        // Host role: create session if needed
        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, { lastActive: Date.now() });
        }
        sessions.get(sessionId)!.host = ws;
      }
    });

    return new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterEach(
    () =>
      new Promise<void>((resolve) =>
        wss.close(() => server.close(() => resolve())),
      ),
  );

  it('rejects client connection to unknown session', async () => {
    const unknownSessionId = '12345678-1234-4123-8123-123456789abc';
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}?role=client&session=${unknownSessionId}`,
    );

    const closePromise = new Promise<{ code: number; reason: string }>(
      (resolve) => {
        ws.on('close', (code, reason) => {
          resolve({ code, reason: reason.toString() });
        });
      },
    );

    const result = await closePromise;
    expect(result.code).toBe(1008);
    expect(result.reason).toBe('Unknown session');
  });

  it('accepts host connection and creates session', async () => {
    const sessionId = '12345678-1234-4123-8123-123456789abc';
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}?role=host&session=${sessionId}`,
    );

    await new Promise<void>((resolve) => {
      ws.on('open', () => resolve());
    });

    expect(sessions.has(sessionId)).toBe(true);
    expect(sessions.get(sessionId)?.host).toBeDefined();

    ws.close();
  });

  it('allows client to connect after host creates session', async () => {
    const sessionId = '12345678-1234-4123-8123-123456789abc';

    // Host connects first
    const hostWs = new WebSocket(
      `ws://127.0.0.1:${port}?role=host&session=${sessionId}`,
    );
    await new Promise<void>((resolve) => {
      hostWs.on('open', () => resolve());
    });

    // Now client can connect
    const clientWs = new WebSocket(
      `ws://127.0.0.1:${port}?role=client&session=${sessionId}`,
    );
    await new Promise<void>((resolve) => {
      clientWs.on('open', () => resolve());
    });

    expect(sessions.get(sessionId)?.client).toBeDefined();

    hostWs.close();
    clientWs.close();
  });

  it('maintains correct connection count after connect/disconnect', async () => {
    const sessionId = '12345678-1234-4123-8123-123456789abc';
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}?role=host&session=${sessionId}`,
    );

    await new Promise<void>((resolve) => {
      ws.on('open', () => resolve());
    });

    // Should have 1 connection
    const ip = '127.0.0.1';
    expect(connectionsPerIp.get(ip)).toBe(1);

    ws.close();

    // Wait for close to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should be back to 0 (deleted from map)
    expect(connectionsPerIp.get(ip)).toBeUndefined();
  });

  it('rejects invalid session ID format', async () => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}?role=host&session=invalid-uuid`,
    );

    const closePromise = new Promise<{ code: number }>((resolve) => {
      ws.on('close', (code) => resolve({ code }));
    });

    const result = await closePromise;
    expect(result.code).toBe(1003);
  });
});
