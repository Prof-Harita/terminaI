# Cloud Relay Fortification Tasks (Bulletproof Execution Plan)

Date: 2025-12-25

This file is an execution-grade task plan for hardening the Cloud Relay feature
described in `docs-terminai/cloud-relay-setup.md`.

## Context (current code pointers)

- Relay server: `packages/cloud-relay/src/server.ts`
  - Stateless WebSocket forwarder; maintains `Map<sessionId, {host, client}>`.
  - Rate limiting: per-IP concurrent + per-minute new connections; global
    session cap.
  - Heartbeat ping/pong + cleanup.

- Host (desktop agent) relay integration:
  `packages/a2a-server/src/http/relay.ts`
  - Generates `sessionId` + random 32-byte AES key.
  - Prints share URL: `...#session=...&key=...&relay=...`.
  - Decrypts `[IV(12)][Tag(16)][Ciphertext]` from client; handles request;
    encrypts response in same framing.
  - Reconnect currently regenerates sessionId/key (bug for UX).

- Web client relay integration: `packages/web-client/relay-client.js`,
  `packages/web-client/app.js`
  - Parses `#session`, `#key`, `#relay`.
  - WebCrypto AES-GCM; formats messages as `[IV][Tag][Ciphertext]` to match
    host.
  - Uses a single-response model today (streaming is not truly supported over
    relay yet).

### Current protocol baseline

- Transport: WebSocket binary frames.
- Encryption: AES-256-GCM.
- Frame format (binary):
  - `[ IV (12 bytes) ] [ Tag (16 bytes) ] [ Ciphertext (N bytes) ]`
- Plaintext currently: JSON-RPC-like request/response objects (no explicit
  envelope, no anti-replay).

---

## 0) Implementation principles (apply to every item)

These are requirements for the work below.

1. **Backwards compatibility plan**: if changing protocol, add a `version`
   negotiation path so old clients fail with a clear message, not silent
   breakage.
2. **Security invariants**:
   - Relay must never learn plaintext or keys.
   - Compromised relay must not be able to cause repeated side effects
     (anti-replay).
   - Share URL is a bearer secret; minimize its persistence.
3. **Test discipline**: every item must ship with:
   - unit tests for crypto framing/interoperability,
   - integration test(s) for end-to-end Host↔Relay↔Client behavior,
   - regression test for the specific bug/attack class.
4. **Observability**: add structured logging + metrics where possible.

---

# 1) Protocol anti-replay + ordering (sequence numbers) + AEAD AAD binding

## Objective

Make it cryptographically and logically impossible for a malicious relay (or
on-path attacker) to replay old encrypted frames and cause the host to execute
commands twice.

## Rationale

AES-GCM authenticates integrity but **does not prevent replay**. Today the relay
can replay a previously captured ciphertext; host will decrypt and execute it
again.

## Deliverables

- A versioned, explicit encrypted envelope.
- Per-direction monotonic sequence enforcement (with a bounded window).
- AEAD Additional Authenticated Data (AAD) binding to session + direction +
  protocol version.

## Design decisions (must be written down in code comments + tests)

1. **Envelope v1 (plaintext JSON)**
   ```json
   {
     "v": 1,
     "type": "HELLO" | "HELLO_ACK" | "RPC" | "EVENT" | "ERROR" | "PING" | "PONG" | "CLOSE",
     "dir": "c2h" | "h2c",
     "seq": 123,
     "ts": 1735080000000,
     "payload": { }
   }
   ```
2. **Sequence rules**
   - Each direction has its own `seq` starting at 1.
   - Receiver tracks `maxSeqSeen` and rejects:
     - duplicates (`seq <= maxSeqSeen`), OR
     - too-far-in-future (`seq > maxSeqSeen + WINDOW`, optional), OR
     - missing/invalid seq.
   - Decide whether you want a strict monotonic counter (simpler) vs sliding
     window (more tolerant of out-of-order). For WebSockets, strict monotonic is
     usually safe.
3. **AAD**
   - Compute `aad = utf8("terminai-relay|v=1|session=<uuid>|dir=<c2h|h2c>")`.
   - Node crypto:
     - `cipher.setAAD(aad)` before final.
     - `decipher.setAAD(aad)` before `final()`.
   - WebCrypto:
     - pass `additionalData: aadBytes` in both encrypt and decrypt.

## Tasks

### 1.1 Define protocol helpers (shared spec)

- Create a small shared “spec” doc comment in code (not a README):
  - In `packages/a2a-server/src/http/relay.ts` and
    `packages/web-client/relay-client.js` document the v1 envelope fields and
    AAD format.
- Add a TypeScript type in server-side code:
  - `type RelayEnvelopeV1 = { v: 1; type: ...; dir: 'c2h'|'h2c'; seq: number; ts: number; payload: unknown }`.

### 1.2 Implement AAD in host encryption/decryption

- In `packages/a2a-server/src/http/relay.ts`:
  - When decrypting incoming frames, before calling `decipher.final()`, call
    `decipher.setAAD(aad)`.
  - When encrypting outgoing frames, call `cipher.setAAD(aad)`.
  - Make sure the same AAD is used consistently based on **direction**.

### 1.3 Implement envelope + seq on host

- Add state:
  - `let inboundMaxSeq = 0; let outboundSeq = 0;`
- On receiving a decrypted message:
  - Parse JSON → validate it matches envelope schema.
  - Verify `v===1`, `dir==='c2h'`, `type` allowed.
  - Verify `seq === inboundMaxSeq + 1` (strict) and then increment.
  - Verify `ts` within a reasonable skew window (e.g., ±10 min) to avoid absurd
    values; do not rely on `ts` for replay, just sanity.
  - Only allow `RPC` after successful handshake (Item #3); until then, reject
    with `ERROR`.
- On sending:
  - Wrap outgoing payload in envelope with `dir:'h2c'`, `seq: ++outboundSeq`,
    `ts: Date.now()`.

### 1.4 Implement AAD + envelope + seq on web client

- In `packages/web-client/relay-client.js`:
  - Store `inboundMaxSeq`, `outboundSeq`.
  - When encrypting, first wrap as envelope with `dir:'c2h'` and increment seq.
  - When decrypting, validate envelope + strict seq.
  - Compute and pass `additionalData` with the same AAD definition.

### 1.5 Add negative tests (replay)

- Unit tests (Node):
  - Create a helper that encrypts a frame, decrypts it, then replays the same
    bytes and confirm rejection.
- Integration tests:
  - Spin relay + host + a simulated client; send one `RPC` twice (same encrypted
    bytes). Assert host executes only once.
- Acceptance criteria:
  - Replayed ciphertext does not trigger `requestHandler.handle()`.
  - Client receives a clear `ERROR` (optional) and the session remains usable.

---

# 2) Fix global DoS: disallow “client-only session” creation

## Objective

Prevent attackers from exhausting `MAX_GLOBAL_SESSIONS` by connecting as
`role=client` with random UUIDs.

## Rationale

Current relay behavior creates a `sessions` entry for unknown sessions on client
connect. This allows a trivial remote DoS without needing keys.

## Deliverables

- Relay only creates sessions on host connect, or uses a strictly bounded
  “pending client” structure not counted as a session.
- Global limits count only “host-present sessions”.

## Tasks

### 2.1 Adjust session creation semantics

- In `packages/cloud-relay/src/server.ts`:
  - On connection parse params.
  - If `role==='client'` and `sessions.get(sessionId)` is undefined:
    - Close connection with `1008` and reason `Unknown session`.
    - Ensure `decrementConnectionCount(ip)` is called.
  - Only create `sessions.set(sessionId, ...)` when `role==='host'`.

### 2.2 Redefine “global capacity” accounting

- Change the global session limit check:
  - Instead of `sessions.size >= MAX_GLOBAL_SESSIONS`, count only sessions that
    have a live `host`.
  - Implement `countActiveHostSessions()`.

### 2.3 Add tests

- Unit test the relay session behavior:
  - Client connect with unknown session must be rejected.
  - Host connect must create session.
  - Client connect after host connect must succeed.
- Abuse test:
  - Attempt N random client connects; verify `sessions.size` remains near 0 and
    health endpoint reflects no growth.

### Acceptance criteria

- Attacker cannot consume session capacity without a host connection.
- Real host/client flows still work.

---

# 3) Explicit handshake phase + version negotiation

## Objective

Introduce a deterministic, testable connection state machine: before executing
any RPC, both sides must complete a handshake that confirms key validity,
protocol version, and optional capabilities.

## Rationale

You need a stable platform for future features (rekey, streaming, pairing,
resume) and safer failure modes.

## Deliverables

- `HELLO`/`HELLO_ACK` messages inside the encrypted envelope.
- State machine on both client and host.

## Tasks

### 3.1 Define handshake payload

- `HELLO.payload` fields (minimum):
  - `clientId` (random UUID per browser session)
  - `capabilities`: `{ streaming: boolean, resume: boolean, ... }`
  - `protocols`: `[1]` (supported versions)
- `HELLO_ACK.payload` fields:
  - `selectedVersion: 1`
  - `serverCapabilities`
  - `sessionPolicy` (timeouts, max frame size, requiresPairing, etc.)

### 3.2 Implement host state machine

- In `packages/a2a-server/src/http/relay.ts`:
  - Add `state: 'WAIT_HELLO' | 'READY' | 'CLOSED'`.
  - Reject any `RPC` while not `READY`.
  - On valid `HELLO`, respond with `HELLO_ACK` and set `READY`.

### 3.3 Implement client handshake

- In `packages/web-client/relay-client.js`:
  - On WebSocket open: send `HELLO` (encrypted envelope).
  - Wait for `HELLO_ACK` before allowing UI to send messages.
  - Update status text accordingly.

### 3.4 Tests

- Integration test: client cannot send `RPC` until `HELLO_ACK` is received.
- Negative test: wrong key → decrypt fails → client shows “bad link / wrong
  key”.

### Acceptance criteria

- A session never executes RPC without handshake.
- Clear user-facing errors for version mismatch.

---

# 4) Pairing moat: local approval required on first client attach

## Objective

Make leaked URLs significantly less dangerous by requiring a host-local pairing
step before enabling command execution.

## Rationale

The URL is a bearer secret. In practice it leaks via clipboard history,
screenshots, logging, chat apps, etc. Pairing anchors security in physical
control of the host.

## Deliverables

- Host blocks RPC until pairing is completed.
- Client UI prompts for pairing code.
- Relay notifies **host** when a client connects (today it only notifies
  client).

## Tasks

### 4.1 Relay: notify host of client connection

- In `packages/cloud-relay/src/server.ts`:
  - When a client connects and a host is already connected:
    - Send a control message to host, e.g.
      `{ type:'RELAY_STATUS', status:'CLIENT_CONNECTED' }`.
  - When client disconnects:
    - Send `{ status:'CLIENT_DISCONNECTED' }`.
  - Keep control messages unencrypted (safe, no secrets).

### 4.2 Host: pairing gate

- In `packages/a2a-server/src/http/relay.ts`:
  - Add `pairingRequired = true` on new session.
  - Generate a `pairingCode` (6–8 digits) and print to local console.
  - Add envelope type `PAIR` with payload `{ code: string }`.
  - Accept `PAIR` only after handshake.
  - On correct code:
    - set `pairingRequired=false` and allow `RPC`.
  - Rate-limit pairing attempts (e.g. 5 tries → close session).
  - Rotate pairing code on new client connect (optional policy).

### 4.3 Client UI

- In `packages/web-client/app.js`:
  - If host indicates pairing is required (via encrypted
    `HELLO_ACK.sessionPolicy.requiresPairing` or via an encrypted `ERROR`), show
    a prompt.
  - Send `PAIR` message over relay.
  - Do not send user messages until paired.

### 4.4 Tests

- Integration test: leaked URL without code cannot execute `RPC`.
- Test: wrong code attempts are rejected; after max tries session closes.

### Acceptance criteria

- Without pairing approval, remote user cannot run commands.
- With correct pairing, session works normally.

---

# 5) Fix reconnect semantics: session/key stability + explicit rotate

## Objective

Reconnect must preserve the sessionId + key so the shared URL remains valid
across transient network drops.

## Rationale

Current host reconnect logic calls `connectToRelay()` recursively and
regenerates sessionId/key, breaking the previously shared URL.

## Deliverables

- Stable session state held for the lifetime of the host process (or until
  explicit rotate).
- Reconnect uses the same sessionId/key.

## Tasks

### 5.1 Refactor host relay connector

- In `packages/a2a-server/src/http/relay.ts`:
  - Split into:
    - `createRelaySession()` → `{ sessionId, key, shareUrl }`
    - `runRelayConnection({ sessionId, key }, relayUrl, requestHandler)` →
      handles WS connect/reconnect.
  - Ensure reconnect reuses `{ sessionId, key }`.
  - Ensure the share URL is logged once per session (or when rotated).

### 5.2 Add explicit “rotate link” behavior

- Define an operator action (even if only environment-variable toggled
  initially):
  - On rotate: close existing ws + generate new sessionId/key + print new URL.
- Make it hard to accidentally rotate on reconnect.

### 5.3 Tests

- Integration: simulate relay drop; ensure client can reconnect and continue
  with same URL.
- Regression: verify the logged share URL does not change across reconnect.

### Acceptance criteria

- A user can keep using the same link after temporary relay outages.

---

# 6) True streaming over relay (SSE-equivalent event frames)

## Objective

Support incremental token streaming and tool events over the relay, matching the
UX of direct SSE.

## Rationale

Streaming is a major product differentiator and essential for long responses;
today relay often devolves to “wait then dump final”.

## Deliverables

- `EVENT` frames that mirror the current SSE `data:` payloads.
- A host execution path that emits events as they occur.

## Tasks

### 6.1 Define streaming event framing

- Envelope type `EVENT` with payload identical to existing SSE JSON objects:
  - i.e., what `handleA2aEvent` already expects.

### 6.2 Host: produce events during execution

- In `packages/a2a-server/src/http/relay.ts`:
  - Replace `requestHandler.handle(requestJson)` for streaming paths with an
    event-driven execution similar to `handleExecuteCommand()` in
    `packages/a2a-server/src/http/app.ts`.
  - Emit each event chunk as an encrypted `EVENT` frame immediately.
  - Send a final `EVENT` with `{ final: true }` or an explicit `CLOSE`.

### 6.3 Client: consume streaming events

- In `packages/web-client/relay-client.js`:
  - When a decrypted envelope is `EVENT`, call `onMessage(evt.payload)` (or wrap
    the same way SSE does).
  - Ensure ordering is enforced by seq (Item #1).

### 6.4 Backpressure

- Define max queued outbound frames; if client is slow:
  - either drop non-critical events, or
  - close session with a clear error.

### 6.5 Tests

- Integration: run a streaming command and assert UI receives multiple
  incremental updates.
- Stress: large output does not OOM either side.

### Acceptance criteria

- Relay mode feels comparable to direct mode for streaming.

---

# 7) Relay-side payload limits + per-session bandwidth caps

## Objective

Prevent resource exhaustion by limiting frame size and throughput at the relay.

## Rationale

Even encrypted blobs can be huge; without `maxPayload` and rate controls, relay
can be trivially degraded.

## Deliverables

- Hard max payload size.
- Token-bucket limits for messages/sec and bytes/sec per connection (and
  optionally per IP).

## Tasks

### 7.1 Configure max payload

- In `packages/cloud-relay/src/server.ts`:
  - Create `wss = new WebSocketServer({ server, maxPayload: <bytes> })`.
  - Choose an initial default (e.g., 1–5MB) based on expected output sizes.
  - Make it configurable via env var.

### 7.2 Implement per-connection rate limiting

- Track per connection:
  - rolling window counters: `bytesIn`, `msgsIn` per second.
- On each `message`:
  - increment counters;
  - if over threshold, close with `1008`.
- Reset counters on interval.

### 7.3 Tests

- Unit: sending a payload larger than `maxPayload` results in close.
- Integration: rapid-fire messages trip the limiter.

### Acceptance criteria

- Relay remains stable under abusive clients.

---

# 8) Multi-instance relay that works without sticky sessions (Redis pub/sub routing)

## Objective

Allow relay to scale horizontally with correct routing even when host and client
connect to different instances.

## Rationale

Sticky sessions are fragile and provider-specific; a robust multi-instance
design is both an availability win and a defensible moat.

## Deliverables

- Optional Redis-backed cross-instance message routing.
- Local fast-path when both ends are co-located.

## Tasks

### 8.1 Choose routing primitive

- Use Redis pub/sub channels:
  - `relay:<sessionId>:toHost`
  - `relay:<sessionId>:toClient`
- A relay instance subscribes when it holds a live host/client socket.

### 8.2 Implement publish/subscribe

- Add Redis client initialization behind env flags (e.g., `REDIS_URL`).
- On `message` from host:
  - If local client present → forward locally.
  - Else publish to `toClient` channel.
- On Redis message for `toClient`:
  - If local client present → forward.
- Symmetric for client→host.

### 8.3 Lifecycle + cleanup

- Subscribe/unsubscribe on connect/disconnect.
- Ensure sessions don’t leak subscriptions.

### 8.4 Tests

- Integration: run 2 relay instances + Redis; connect host to instance A and
  client to instance B; verify end-to-end works.

### Acceptance criteria

- Works without session affinity.
- Does not expose plaintext (still opaque frames).

---

# 9) Observability + abuse detection for an encrypted relay

## Objective

Operate a public relay safely with strong visibility despite opaque traffic.

## Rationale

You can’t inspect payload content; you must win on metadata: session churn,
bytes, rate-limit hits, disconnect reasons, geo/IP patterns.

## Deliverables

- Structured JSON logs.
- Basic metrics (Prometheus-style or provider-native) for operations.

## Tasks

### 9.1 Structured logging

- In `packages/cloud-relay/src/server.ts`:
  - Replace ad-hoc `console.log` strings with structured objects.
  - Include fields:
    - `event`, `sessionIdHash` (hash sessionId, do not log raw if you consider
      it sensitive), `role`, `ip`, `bytes`, `closeCode`, `reason`,
      `rateLimitType`.

### 9.2 Metrics

- Add counters/gauges:
  - `relay_active_connections`
  - `relay_active_host_sessions`
  - `relay_active_paired_sessions`
  - `relay_rate_limit_reject_total{type=...}`
  - `relay_bytes_in_total`, `relay_bytes_out_total`
- Expose `/metrics` or integrate with Cloud Run metrics.

### 9.3 Alerting policies (operational tasks)

- Define thresholds:
  - sudden spikes in `rate_limit_reject_total`
  - sustained high connections
  - high disconnect churn

### Acceptance criteria

- Operators can detect abuse and capacity issues early without decrypting
  traffic.

---

# 10) Share-link hardening in the web client (reduce accidental leakage)

## Objective

Reduce the probability that the session key leaks through browser history,
referrers, logging, or storage.

## Rationale

The dominant real-world failure mode is link/key leakage, not cryptographic
breakage.

## Deliverables

- Key removed from address bar/history immediately after parsing.
- No persistence of key unless explicitly opted in.
- Strong browser security headers on the page serving `/remote` (where
  applicable).

## Tasks

### 10.1 Strip fragment immediately

- In `packages/web-client/app.js`:
  - After parsing `window.location.hash`, call:
    - `history.replaceState(null, '', window.location.pathname + window.location.search)`
  - Ensure this happens before any error logging that might include the URL.

### 10.2 Avoid persistent storage of key

- Do not put relay key into `localStorage` or query params.
- If you add “remember this device”, store only a device id, never the key.

### 10.3 Add security headers for hosted web client

- Where you serve `/remote`:
  - `Referrer-Policy: no-referrer`
  - strong CSP (no inline scripts unless hashed),
  - `Cache-Control: no-store`.
- If `/ui` is served from `packages/a2a-server/src/http/app.ts` via
  `express.static`, add middleware for headers on that route.

### 10.4 Tests

- Browser/unit test (or manual checklist) verifying:
  - address bar no longer contains `#key=...` after load.
  - reload behavior is well-defined (you may need to keep key in memory only, so
    reload will require re-opening link).

### Acceptance criteria

- Key is not left in navigable history.

---

# Suggested execution order (fastest security ROI)

1. Item #2 (client-only session DoS)
2. Item #5 (reconnect stability)
3. Item #1 (anti-replay + AAD)
4. Item #3 (handshake)
5. Item #7 (payload limits)
6. Item #10 (strip fragment)
7. Item #4 (pairing)
8. Item #6 (streaming)
9. Item #9 (obs)
10. Item #8 (multi-instance)

# Definition of Done (for the whole initiative)

- A compromised relay can:
  - drop, delay, reorder connections;
  - but **cannot** cause replayed commands to execute.
- Public relay cannot be trivially DoSed via client-only session spam.
- Share URL remains valid through reconnects.
- Large outputs do not crash relay.
- Operators have actionable telemetry.
