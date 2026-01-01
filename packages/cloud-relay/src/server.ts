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
const MAX_CONNECTIONS_PER_IP = Number(process.env.MAX_CONNECTIONS_PER_IP) || 10;
const MAX_NEW_CONNECTIONS_PER_IP_PER_MINUTE =
  Number(process.env.MAX_NEW_CONNECTIONS_PER_IP_PER_MINUTE) || 30;
const MAX_GLOBAL_SESSIONS = Number(process.env.MAX_GLOBAL_SESSIONS) || 1000;
const MAX_PAYLOAD_BYTES =
  Number(process.env.MAX_PAYLOAD_BYTES) || 5 * 1024 * 1024;
const MAX_MSGS_PER_SEC_PER_CONNECTION =
  Number(process.env.MAX_MSGS_PER_SEC_PER_CONNECTION) || 10;
const MAX_BYTES_PER_SEC_PER_CONNECTION =
  Number(process.env.MAX_BYTES_PER_SEC_PER_CONNECTION) || 1024 * 1024;
const MAX_MSGS_PER_SEC_PER_IP =
  Number(process.env.MAX_MSGS_PER_SEC_PER_IP) || 100;
const MAX_BYTES_PER_SEC_PER_IP =
  Number(process.env.MAX_BYTES_PER_SEC_PER_IP) || 10 * 1024 * 1024;

// =============================================================================
// Types
// =============================================================================

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  ip: string;
  bytesIn: number;
  msgsIn: number;
  lastReset: number;
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
const bytesPerIp = new Map<string, { count: number; resetAt: number }>();
const msgsPerIp = new Map<string, { count: number; resetAt: number }>();

// =============================================================================
// HTTP Server
// =============================================================================

const server = createServer((req, res) => {
  if (req.url === '/health') {
    let sessionsWithHost = 0;
    let sessionsWithClient = 0;
    for (const session of sessions.values()) {
      if (session.host?.readyState === WebSocket.OPEN) sessionsWithHost++;
      if (session.client?.readyState === WebSocket.OPEN) sessionsWithClient++;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        sessionsTotal: sessions.size,
        sessionsWithHost,
        sessionsWithClient,
        connections: wss.clients.size,
      }),
    );
    return;
  }
  if (req.url === '/metrics') {
    // Basic Prometheus-style metrics
    let metrics =
      '# HELP relay_active_connections Total active WebSocket connections\n';
    metrics += `# TYPE relay_active_connections gauge\nrelay_active_connections ${wss.clients.size}\n`;
    metrics += '# HELP relay_active_sessions Total active sessions\n';
    metrics += `# TYPE relay_active_sessions gauge\nrelay_active_sessions ${sessions.size}\n`;
    metrics += '# HELP relay_sessions_with_host Sessions with active host\n';
    let hostSessions = 0;
    for (const s of sessions.values()) {
      if (s.host?.readyState === WebSocket.OPEN) hostSessions++;
    }
    metrics += `# TYPE relay_sessions_with_host gauge\nrelay_sessions_with_host ${hostSessions}\n`;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(metrics);
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES });

// =============================================================================
// Heartbeat: Ping all connections every 30 seconds
// =============================================================================

setInterval(() => {
  wss.clients.forEach((ws) => {
    const extWs = ws as ExtendedWebSocket;

    if (extWs.isAlive === false) {
      console.log(
        JSON.stringify({
          event: 'heartbeat_timeout',
          ip: extWs.ip,
          timestamp: Date.now(),
        }),
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
      console.log(
        JSON.stringify({
          event: 'session_cleanup',
          sessionIdHash: id.slice(0, 8),
          timestamp: Date.now(),
        }),
      );
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
// Helper: Count active host sessions
// =============================================================================

function countActiveHostSessions(): number {
  let count = 0;
  for (const session of sessions.values()) {
    if (session.host?.readyState === WebSocket.OPEN) {
      count++;
    }
  }
  return count;
}

// =============================================================================
// Helper: Check rate limits
// =============================================================================

function checkRateLimits(ws: WebSocket, ip: string): boolean {
  // Check global session limit (only count sessions with active host)
  if (countActiveHostSessions() >= MAX_GLOBAL_SESSIONS) {
    console.log(
      JSON.stringify({
        event: 'rate_limit',
        type: 'global_sessions',
        limit: MAX_GLOBAL_SESSIONS,
        timestamp: Date.now(),
      }),
    );
    ws.close(1008, 'Server at capacity');
    return false;
  }

  // Check per-IP concurrent connection limit
  const currentCount = connectionsPerIp.get(ip) || 0;
  if (currentCount >= MAX_CONNECTIONS_PER_IP) {
    console.log(
      JSON.stringify({
        event: 'rate_limit',
        type: 'concurrent_ip',
        ip,
        limit: MAX_CONNECTIONS_PER_IP,
        timestamp: Date.now(),
      }),
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
      JSON.stringify({
        event: 'rate_limit',
        type: 'new_connections_ip',
        ip,
        limit: MAX_NEW_CONNECTIONS_PER_IP_PER_MINUTE,
        timestamp: Date.now(),
      }),
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

  let counted = false;

  // Register close handler immediately to ensure decrement happens
  extWs.on('close', () => {
    if (counted) {
      decrementConnectionCount(ip);
    }
  });

  // Rate limit check
  if (!checkRateLimits(ws, ip)) {
    return;
  }
  counted = true;

  extWs.bytesIn = 0;
  extWs.msgsIn = 0;
  extWs.lastReset = Date.now();

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
    return;
  }

  // Handle session creation per role
  let session: Session;
  if (role === 'client') {
    const existing = sessions.get(sessionId);
    if (!existing) {
      ws.close(1008, 'Unknown session');
      return;
    }
    session = existing;
  } else {
    // host
    let existing = sessions.get(sessionId);
    if (!existing) {
      existing = { lastActive: Date.now() };
      sessions.set(sessionId, existing);
    }
    session = existing;
  }

  // Register socket by role
  if (role === 'host') {
    if (session.host?.readyState === WebSocket.OPEN) {
      session.host.close(1008, 'New host connected');
    }
    session.host = extWs;
    console.log(
      JSON.stringify({
        event: 'host_connected',
        sessionIdHash: sessionId.slice(0, 8),
        ip,
        timestamp: Date.now(),
      }),
    );

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
    console.log(
      JSON.stringify({
        event: 'client_connected',
        sessionIdHash: sessionId.slice(0, 8),
        ip,
        timestamp: Date.now(),
      }),
    );

    // Notify client that host is ready (if host exists)
    if (session.host?.readyState === WebSocket.OPEN) {
      extWs.send(
        JSON.stringify({ type: 'RELAY_STATUS', status: 'HOST_CONNECTED' }),
      );
      // Notify host of client connection
      session.host.send(
        JSON.stringify({ type: 'RELAY_STATUS', status: 'CLIENT_CONNECTED' }),
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

    // Rate limiting per connection
    const now = Date.now();
    if (now - extWs.lastReset > 1000) {
      extWs.bytesIn = 0;
      extWs.msgsIn = 0;
      extWs.lastReset = now;
    }
    extWs.msgsIn++;
    let dataLen = 0;
    if (Buffer.isBuffer(data)) {
      dataLen = data.length;
    } else if (data instanceof ArrayBuffer) {
      dataLen = data.byteLength;
    } else if (Array.isArray(data)) {
      dataLen = data.reduce(
        (sum, buf) => sum + (Buffer.isBuffer(buf) ? buf.length : 0),
        0,
      );
    }
    extWs.bytesIn += dataLen;
    if (
      extWs.msgsIn > MAX_MSGS_PER_SEC_PER_CONNECTION ||
      extWs.bytesIn > MAX_BYTES_PER_SEC_PER_CONNECTION
    ) {
      extWs.close(1008, 'Rate limit exceeded');
      return;
    }

    // Per-IP rate limiting
    let ipMsgs = msgsPerIp.get(ip) || { count: 0, resetAt: now + 1000 };
    let ipBytes = bytesPerIp.get(ip) || { count: 0, resetAt: now + 1000 };
    if (now >= ipMsgs.resetAt) {
      ipMsgs = { count: 0, resetAt: now + 1000 };
    }
    if (now >= ipBytes.resetAt) {
      ipBytes = { count: 0, resetAt: now + 1000 };
    }
    ipMsgs.count++;
    ipBytes.count += dataLen;
    msgsPerIp.set(ip, ipMsgs);
    bytesPerIp.set(ip, ipBytes);
    if (
      ipMsgs.count > MAX_MSGS_PER_SEC_PER_IP ||
      ipBytes.count > MAX_BYTES_PER_SEC_PER_IP
    ) {
      extWs.close(1008, 'IP rate limit exceeded');
      return;
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

  // Cleanup on disconnect - session/role tracking and RELAY_STATUS notifications
  extWs.on('close', () => {
    if (role === 'host') {
      console.log(
        JSON.stringify({
          event: 'host_disconnected',
          sessionIdHash: sessionId.slice(0, 8),
          timestamp: Date.now(),
        }),
      );
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
      console.log(
        JSON.stringify({
          event: 'client_disconnected',
          sessionIdHash: sessionId.slice(0, 8),
          timestamp: Date.now(),
        }),
      );
      if (session) {
        session.client = undefined;
        if (session.host?.readyState === WebSocket.OPEN) {
          session.host.send(
            JSON.stringify({
              type: 'RELAY_STATUS',
              status: 'CLIENT_DISCONNECTED',
            }),
          );
        }
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
