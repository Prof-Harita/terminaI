# Cloud Relay: Outstanding Tasks / Issues (Post-Execution Code Review)

Date: 2025-12-25

This file captures **everything still outstanding** and **all issues found** in
the current Cloud Relay implementation, intended as the next implementation
round input.

## Scope reviewed

- Relay server: `packages/cloud-relay/src/server.ts`
- Host connector: `packages/a2a-server/src/http/relay.ts`
- Web client (current behavior baseline): `packages/web-client/app.js`,
  `packages/web-client/relay-client.js`

## What was implemented (and appears correct)

1. **Client-only session exhaustion mitigation (partial)**
   - Relay now rejects `role=client` connections for unknown `sessionId`
     (`1008 Unknown session`).
   - Relay only creates `sessions` entries on `role=host` connect.
   - Global session cap now counts only sessions with an active host
     (`countActiveHostSessions()`).

2. **Host reconnect no longer rotates sessionId/key (partial)**
   - `createRelaySession()` creates sessionId/key once; reconnects reuse them
     via `runRelayConnection(session, ...)`.

These are good steps, but **not yet bulletproof** due to issues below.

---

# P0 Issues (must fix before considering the relay safe/reliable)

## P0.1 Relay server leaks per-IP connection counts on early-returns (rate limit + protocol errors)

### Why it matters

`checkRateLimits()` increments `connectionsPerIp` and `connectionAttemptsPerIp`.
If the connection is closed **before the `close` handler is registered**, the
decrement never happens. This causes:

- false “Too many connections from this IP” blocks,
- gradual self-DoS for legitimate users,
- incorrect operational metrics.

### Where

`packages/cloud-relay/src/server.ts`

- `wss.on('connection', ...)` calls `checkRateLimits(ws, ip)` and can `return`
  early.
- In the early-return branches, no `decrementConnectionCount(ip)` is executed,
  and no `close` handler exists yet.

### Required fix

Restructure connection handling so that **every increment has a guaranteed
decrement**.

### Implementation tasks (choose one approach; prefer A)

**Approach A (recommended): register close handler immediately and only then do
checks**

1. At the top of `wss.on('connection', ...)`, register a `ws.on('close', ...)`
   handler that always calls `decrementConnectionCount(ip)` exactly once.
2. Maintain a boolean flag like `let counted = false;` so you only decrement if
   you incremented.
3. In `checkRateLimits`, only increment counters after it has decided to allow
   the connection; set `counted=true` at the callsite.

**Approach B: explicit decrement on every early return**

1. After `checkRateLimits` failure, call `decrementConnectionCount(ip)` before
   returning.
2. Also add decrements for `!req.url` (“Protocol Error”) and any other
   early-close branches.
3. Carefully ensure no double-decrement occurs when the `close` handler is later
   registered.

### Tests

1. Unit/integration test:
   - Connect with missing/invalid params such that server closes immediately.
   - Verify a subsequent valid connect from same IP is not blocked due to leaked
     counters.
2. Test rate-limit rejection path:
   - Trigger rate limit and ensure counters do not permanently block future
     connections.

### Acceptance criteria

- Connection counters return to baseline after rejected connections.
- Repeated invalid connects do not permanently exhaust per-IP limits.

---

## P0.2 Host reconnect backoff is effectively reset on every reconnect

### Why it matters

`reconnectAttempts` is declared inside `runRelayConnection()`. When a connection
closes, it calls `runRelayConnection(...)` again, creating a new scope and
resetting `reconnectAttempts` to `0`. Result:

- backoff is not exponential across repeated failures (likely always ~5s),
- can hammer relay during outages,
- can burn client battery/data and increase load.

### Where

`packages/a2a-server/src/http/relay.ts` in `runRelayConnection()`.

### Required fix

Persist reconnect state across reconnect calls.

### Implementation tasks

1. Extend `RelaySession` to include reconnect state, e.g.
   `reconnectAttempts: number`.
2. In `runRelayConnection`, increment `session.reconnectAttempts` on close.
3. On `open`, reset `session.reconnectAttempts = 0`.
4. Ensure only one reconnect timer is active at a time (track timer id; avoid
   parallel reconnect loops).

### Tests

1. Unit test for delay growth: simulate multiple sequential closes and assert
   computed delay increases up to cap.

### Acceptance criteria

- Backoff increases across repeated close events until capped.
- On successful connect, backoff resets.

---

## P0.3 Missing tests for newly changed behavior (relay + host)

### Why it matters

The relay and host changes are security/availability critical. Without tests,
regressions will reintroduce DoS vectors or break remote access.

### Required additions

#### Relay server tests (`packages/cloud-relay`)

1. Add a test harness that starts the relay server on an ephemeral port.
2. Tests:
   - `client unknown session` is rejected with close reason.
   - `host then client` pairs successfully.
   - `global session limit counts host sessions only`.
   - `counters do not leak` (see P0.1).

#### Host relay connector tests (`packages/a2a-server`)

1. Add tests for `createRelaySession()`:
   - sessionId is UUIDv4,
   - key length 32,
   - shareUrl encodes key and relay URL.
2. Add reconnect stability test:
   - simulate websocket close,
   - verify next connection uses same `session.sessionId`.

### Acceptance criteria

- CI-level tests cover the new “Unknown session” policy and reconnect stability.

---

# P0 Security/Design items still NOT implemented (from the fortification plan)

## P0.4 No anti-replay / ordering / AAD binding exists yet

### Why it matters

Relay can replay old ciphertext frames → host will re-execute commands (side
effects). AES-GCM integrity is not replay protection.

### Required implementation

Implement Item #1 from `tasks_cloud_relay.md`:

- encrypted envelope with `seq`,
- strict ordering or replay window,
- AES-GCM AAD binding to `sessionId` + direction + version.

### Acceptance criteria

- Replayed ciphertext never triggers a second command execution.

---

## P0.5 No explicit handshake/versioning gate exists yet

### Why it matters

There is no controlled place to:

- negotiate protocol changes,
- fail closed on mismatch,
- establish a “READY” state before processing RPC.

### Required implementation

Implement Item #3 from `tasks_cloud_relay.md`:

- `HELLO` / `HELLO_ACK` in encrypted envelope,
- host refuses `RPC` before handshake.

---

## P0.6 Relay has no max payload size / bytes-per-second limiting

### Why it matters

Even opaque frames can be huge; a few large frames can cause memory pressure, GC
churn, or process crashes.

### Required implementation

Implement Item #7 from `tasks_cloud_relay.md`:

- `maxPayload` on `WebSocketServer`,
- message rate + throughput caps.

---

## P0.7 Web client does not strip the key from URL fragment after parsing

### Why it matters

Key remains in browser address bar/history and can leak via:

- screenshots,
- screen sharing,
- shared browser history,
- copying the URL later.

### Required implementation

Implement Item #10.1 from `tasks_cloud_relay.md`:

- after reading `window.location.hash`, call `history.replaceState(...)` to
  remove fragment.

---

# P1 Issues / Missing features (next priority)

## P1.1 Relay does not notify host about client connect/disconnect

### Why it matters

Pairing UX and host-local gating require host to be aware of a client attach
event. Current relay only notifies the client (`RELAY_STATUS`).

### Required implementation

Implement Item #4.1 from `tasks_cloud_relay.md`:

- send host `RELAY_STATUS: CLIENT_CONNECTED / CLIENT_DISCONNECTED` control
  messages.

---

## P1.2 Host prints full share URL (including key) unconditionally

### Why it matters

This is a real-world leakage vector (terminal scrollback, log aggregation,
screenshots). If you keep this behavior, it should be a deliberate policy.

### Suggested change

1. Default: print a short message + require an explicit `--print-relay-url` flag
   or env var to print the full URL.
2. Or: print a QR code + one-time copy flow.
3. If printing, consider redaction in non-interactive logs.

### Acceptance criteria

- It is hard to accidentally leak the key in logs.

---

## P1.3 Health endpoint is misleading (sessions size vs active host sessions)

### Why it matters

`/health` returns `sessions: sessions.size`, but global capacity logic uses
`countActiveHostSessions()`. Operators will misread capacity.

### Required change

Update `/health` JSON to include:

- `sessionsTotal`,
- `sessionsWithHost`,
- `sessionsWithClient`,
- `connections`.

---

# P2 Product moat features still missing

## P2.1 Pairing moat not implemented

Implement Item #4 from `tasks_cloud_relay.md`:

- pairing code gate before enabling RPC.

## P2.2 True streaming over relay not implemented

Implement Item #6:

- encrypted `EVENT` frames matching SSE events.

## P2.3 Observability package not implemented

Implement Item #9:

- structured logs + metrics endpoint.

## P2.4 Multi-instance relay routing not implemented

Implement Item #8:

- Redis pub/sub routing when host/client land on different instances.

---

# Recommended next-round execution order

1. P0.1 Fix relay counter leaks (must-do correctness)
2. P0.2 Fix host reconnect backoff persistence
3. P0.3 Add tests for relay + host
4. P0.6 Add relay maxPayload + throughput caps
5. P0.7 Strip URL fragment in web client
6. P0.4 Anti-replay + AAD
7. P0.5 Handshake/version gate
8. P1.1 Host notifications
9. Pairing moat + streaming
10. Observability + multi-instance
