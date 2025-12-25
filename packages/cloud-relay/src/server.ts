/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type IncomingMessage } from 'node:http';
import { parse } from 'node:url';

// =============================================================================
// Configuration
// =============================================================================

const port = Number(process.env.PORT) || 8080;

// Heartbeat configuration
const HEARTBEAT_INTERVAL_MS = 30_000; // Send ping every 30 seconds
const CONNECTION_TIMEOUT_MS = 60_000; // Consider dead if no activity in 60s

// Rate limiting configuration
const MAX_CONNECTIONS_PER_IP = 10;
const MAX_NEW_CONNECTIONS_PER_IP_PER_MINUTE = 30;
const MAX_GLOBAL_SESSIONS = 1000;

// =============================================================================
// Types
// =============================================================================

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  ip: string;
}

interface Session {
  host?: ExtendedWebSocket;
  client?: ExtendedWebSocket;
  lastActive: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// =============================================================================
// State
// =============================================================================

// Active sessions: Map<session_id, Session>
const sessions = new Map<string, Session>();

// Rate limiting: Track connections per IP
const connectionsPerIp = new Map<string, number>();
const connectionAttemptsPerIp = new Map<string, RateLimitEntry>();

// =============================================================================
// HTTP Server
// =============================================================================

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        sessions: sessions.size,
        connections: wss.clients.size,
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

// =============================================================================
// Heartbeat: Ping all connections every 30 seconds
// =============================================================================

setInterval(() => {
  wss.clients.forEach((ws) => {
    const extWs = ws as ExtendedWebSocket;

    if (extWs.isAlive === false) {
      console.log(
        `[Heartbeat] Terminating unresponsive connection from ${extWs.ip}`,
      );
      extWs.terminate();
      return;
    }

    extWs.isAlive = false;
    extWs.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

// =============================================================================
// Session Cleanup: Remove empty sessions after 1 minute of inactivity
// =============================================================================

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (
      !session.host &&
      !session.client &&
      now - session.lastActive > CONNECTION_TIMEOUT_MS
    ) {
      sessions.delete(id);
      console.log(`[Cleanup] Removed stale session ${id}`);
    }
  }
}, 30_000);

// =============================================================================
// Rate Limit Cleanup: Reset per-minute counters
// =============================================================================

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of connectionAttemptsPerIp.entries()) {
    if (now >= data.resetAt) {
      connectionAttemptsPerIp.delete(ip);
    }
  }
}, 60_000);

// =============================================================================
// Helper: Get client IP (handles proxies)
// =============================================================================

function getClientIp(req: IncomingMessage): string {
  // Check X-Forwarded-For header (Cloud Run sets this)
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// =============================================================================
// Helper: Check rate limits
// =============================================================================

function checkRateLimits(ws: WebSocket, ip: string): boolean {
  // Check global session limit
  if (sessions.size >= MAX_GLOBAL_SESSIONS) {
    console.log(
      `[RateLimit] Global session limit reached (${MAX_GLOBAL_SESSIONS})`,
    );
    ws.close(1008, 'Server at capacity');
    return false;
  }

  // Check per-IP concurrent connection limit
  const currentCount = connectionsPerIp.get(ip) || 0;
  if (currentCount >= MAX_CONNECTIONS_PER_IP) {
    console.log(
      `[RateLimit] IP ${ip} exceeded concurrent limit (${MAX_CONNECTIONS_PER_IP})`,
    );
    ws.close(1008, 'Too many connections from this IP');
    return false;
  }

  // Check per-IP rate limit (new connections per minute)
  const now = Date.now();
  const attempts = connectionAttemptsPerIp.get(ip) || {
    count: 0,
    resetAt: now + 60_000,
  };

  if (attempts.count >= MAX_NEW_CONNECTIONS_PER_IP_PER_MINUTE) {
    console.log(
      `[RateLimit] IP ${ip} exceeded rate limit (${MAX_NEW_CONNECTIONS_PER_IP_PER_MINUTE}/min)`,
    );
    ws.close(1008, 'Rate limit exceeded. Try again later.');
    return false;
  }

  // Update rate limit counters
  connectionsPerIp.set(ip, currentCount + 1);
  connectionAttemptsPerIp.set(ip, {
    count: attempts.count + 1,
    resetAt: attempts.resetAt,
  });

  return true;
}

// =============================================================================
// WebSocket Connection Handler
// =============================================================================

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const extWs = ws as ExtendedWebSocket;
  const ip = getClientIp(req);
  extWs.ip = ip;
  extWs.isAlive = true;

  // Rate limit check
  if (!checkRateLimits(ws, ip)) {
    return;
  }

  // Parse URL parameters
  if (!req.url) {
    ws.close(1002, 'Protocol Error');
    return;
  }

  const { query } = parse(req.url, true);
  const role = query.role as string;
  const sessionId = query.session as string;

  // Validate session ID format (UUID v4)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    !sessionId ||
    !uuidRegex.test(sessionId) ||
    (role !== 'host' && role !== 'client')
  ) {
    ws.close(1003, 'Invalid params. Require ?role=host|client&session=<uuid>');
    decrementConnectionCount(ip);
    return;
  }

  // Get or create session
  let session = sessions.get(sessionId);
  if (!session) {
    session = { lastActive: Date.now() };
    sessions.set(sessionId, session);
  }

  // Register socket by role
  if (role === 'host') {
    if (session.host?.readyState === WebSocket.OPEN) {
      session.host.close(1008, 'New host connected');
    }
    session.host = extWs;
    console.log(`[${sessionId}] Host connected from ${ip}`);

    // Notify client if waiting
    if (session.client?.readyState === WebSocket.OPEN) {
      session.client.send(
        JSON.stringify({ type: 'RELAY_STATUS', status: 'HOST_CONNECTED' }),
      );
    }
  } else {
    if (session.client?.readyState === WebSocket.OPEN) {
      session.client.close(1008, 'New client connected');
    }
    session.client = extWs;
    console.log(`[${sessionId}] Client connected from ${ip}`);

    // Notify client that host is ready (if host exists)
    if (session.host?.readyState === WebSocket.OPEN) {
      extWs.send(
        JSON.stringify({ type: 'RELAY_STATUS', status: 'HOST_CONNECTED' }),
      );
    }
  }

  // Heartbeat: Mark alive on pong
  extWs.on('pong', () => {
    extWs.isAlive = true;
    if (session) {
      session.lastActive = Date.now();
    }
  });

  // Relay messages between host and client
  extWs.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
    if (session) {
      session.lastActive = Date.now();
    }

    if (role === 'host' && session?.client?.readyState === WebSocket.OPEN) {
      session.client.send(data);
    } else if (
      role === 'client' &&
      session?.host?.readyState === WebSocket.OPEN
    ) {
      session.host.send(data);
    }
  });

  // Cleanup on disconnect
  extWs.on('close', () => {
    decrementConnectionCount(ip);

    if (role === 'host') {
      console.log(`[${sessionId}] Host disconnected`);
      if (session) {
        session.host = undefined;
        if (session.client?.readyState === WebSocket.OPEN) {
          session.client.send(
            JSON.stringify({
              type: 'RELAY_STATUS',
              status: 'HOST_DISCONNECTED',
            }),
          );
        }
      }
    } else {
      console.log(`[${sessionId}] Client disconnected`);
      if (session) {
        session.client = undefined;
      }
    }
  });
});

// =============================================================================
// Helper: Decrement connection count on disconnect
// =============================================================================

function decrementConnectionCount(ip: string): void {
  const count = connectionsPerIp.get(ip) || 1;
  if (count <= 1) {
    connectionsPerIp.delete(ip);
  } else {
    connectionsPerIp.set(ip, count - 1);
  }
}

// =============================================================================
// Start Server
// =============================================================================

server.listen(port, () => {
  console.log(`Cloud Relay listening on port ${port}`);
  console.log(`  Heartbeat: every ${HEARTBEAT_INTERVAL_MS / 1000}s`);
  console.log(`  Max sessions: ${MAX_GLOBAL_SESSIONS}`);
  console.log(`  Max connections/IP: ${MAX_CONNECTIONS_PER_IP}`);
  console.log(`  Rate limit: ${MAX_NEW_CONNECTIONS_PER_IP_PER_MINUTE}/min/IP`);
});
