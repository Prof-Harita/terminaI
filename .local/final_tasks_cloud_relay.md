# Cloud Relay Final Review (post “execution complete”)

Date: 2025-12-25

This is the final code review of the completed Cloud Relay hardening work.

## Scope reviewed

- Relay server: `packages/cloud-relay/src/server.ts`
- Host relay connector: `packages/a2a-server/src/http/relay.ts`
- Web client relay integration: `packages/web-client/relay-client.js`,
  `packages/web-client/app.js`

## Verdict

**Many of the intended fortifications are now implemented** (session-spam
mitigation, max payload, per-connection/IP rate limiting, structured
logs/metrics, handshake, AES-GCM AAD binding, sequence-based anti-replay,
pairing requirement, and URL fragment stripping).

However, **there are critical unintended bugs/regressions that prevent this from
meeting “bulletproof” expectations**, and a couple of security/reliability gaps
remain.

---

# What meets expectations

## A) Relay server (`packages/cloud-relay/src/server.ts`)

- **Client-only session DoS mitigation**: `role=client` now requires an existing
  session created by `role=host`.
- **Global capacity counting**: global session cap counts active host sessions.
- **Max payload**: `WebSocketServer({ maxPayload: MAX_PAYLOAD_BYTES })` is in
  place.
- **Rate limiting**:
  - per-connection msg/sec and bytes/sec limits exist.
  - per-IP msg/sec and bytes/sec limits exist.
- **Observability**:
  - `/health` now reports sessions totals and
    sessionsWithHost/sessionsWithClient.
  - `/metrics` exists (basic Prometheus style).
  - logs are largely structured JSON.
- **Host/client connect/disconnect signals**: relay now sends
  `RELAY_STATUS: CLIENT_CONNECTED/CLIENT_DISCONNECTED` to the host when
  appropriate.

## B) Host connector (`packages/a2a-server/src/http/relay.ts`)

- **Session stability**: `RelaySession` persists across reconnect; reconnect no
  longer rotates sessionId/key.
- **Exponential backoff**: reconnect attempts are tracked on
  `session.reconnectAttempts` and reset on connect.
- **Protocol hardening**:
  - Envelope type `RelayEnvelopeV1` with `v`, `dir`, `seq`, `type`, `payload`.
  - AES-GCM **AAD binding** (`setAAD`) for both directions.
  - Strict sequence validation (`seq === inboundMaxSeq + 1`) provides
    **anti-replay within a single host connection**.
  - Handshake gate: `HELLO` → `HELLO_ACK` required before processing.
- **Pairing gate**: `pairingRequired` defaults to true and `RPC` only executes
  once pairing is completed.
- **Reduced key leakage**: share URL is printed only if `PRINT_RELAY_URL=true`.

## C) Web client (`packages/web-client/*`)

- **Fragment stripping**: `app.js` removes `#session/key/relay` from the URL
  after parsing.
- **Handshake + envelope**:
  - Client sends `HELLO` on websocket open.
  - Client enforces `h2c` sequence ordering.
  - WebCrypto AES-GCM uses `additionalData` for AAD.
- **RPC gating**: `send()` refuses to send before handshake is complete.

---

# Critical unintended bugs / regressions (must fix)

## 1) Relay server double-/triple-decrements per-IP connection counts (rate limiting becomes incorrect)

### Where

`packages/cloud-relay/src/server.ts`

- One `close` handler is registered early:
  - decrements if `counted`.
- A second `close` handler later decrements unconditionally.
- Several early-close branches call `decrementConnectionCount(ip)` manually **in
  addition** to the close handlers.

### Impact

- **Under-counting connections** for an IP, enabling bypass of
  `MAX_CONNECTIONS_PER_IP`.
- Potential negative/incorrect accounting behavior (function defaults `count` to
  1 when missing).

### Required fix

- Ensure exactly **one** decrement per successful increment.
- Remove manual decrements in branches where a counted close handler will run,
  or remove the counted close handler and keep a single cleanup close handler.

## 2) Relay server rate limiting logic is duplicated and double-counts bytes

### Where

`packages/cloud-relay/src/server.ts` in the `message` handler:

- `extWs.bytesIn += dataLen;` and later **again**
  `extWs.bytesIn += dataLength;`.
- There are **two** sets of per-connection limit checks:
  - one using constants,
  - one re-reading env vars (`maxMsgsPerSec`, `maxBytesPerSec`).

### Impact

- Limits trigger too aggressively (bytes are double-counted).
- Harder to reason about and test.

### Required fix

- Deduplicate the per-connection accounting and perform a single check.

## 3) Host ignores relay control messages and logs warnings

### Where

`packages/a2a-server/src/http/relay.ts`

- `ws.on('message', ...)` returns early if `!Buffer.isBuffer(data)`.
- Relay now sends `RELAY_STATUS` JSON strings (unencrypted) to host.

### Impact

- Host never reacts to `CLIENT_CONNECTED/CLIENT_DISCONNECTED`.
- Host will emit noisy warnings and can’t implement “reset pairing on new client
  attach”.

### Required fix

- Parse string messages and handle/ignore `RELAY_STATUS` without warnings.

## 4) Protocol handshake/sequence breaks when the host reconnects but the client websocket stays connected

### Why this is severe

- Client only sends `HELLO` on **client websocket open**.
- Host expects `HELLO` on **host websocket open** (it resets `state` and
  `inboundMaxSeq/outboundSeq` per `runRelayConnection` call).

### Failure mode

If the host websocket drops and reconnects (same `sessionId`), the browser’s
websocket often stays connected to the relay.

- Relay will send the client `RELAY_STATUS: HOST_CONNECTED`.
- Client does **not** re-send `HELLO` on this event.
- Host stays stuck in `WAIT_HELLO` and will reject all RPC.

### Required fix

- When client receives `RELAY_STATUS: HOST_CONNECTED`, it must:
  - reset its `state` to `WAIT_HELLO`,
  - reset `inboundMaxSeq/outboundSeq` (or introduce an epoch),
  - re-send `HELLO`.
- Alternatively, shift handshake responsibility so the host can initiate
  handshake to an already-connected client.

## 5) Web client pairing code sending is broken (Promise passed to `ws.send`)

### Where

`packages/web-client/relay-client.js`:

- `sendPairingCode(code)` calls:
  - `const encrypted = this.encryptEnvelope(pairEnvelope);`
  - `this.ws.send(encrypted);`

`encryptEnvelope` is async, so `encrypted` is a Promise.

### Impact

- Pairing cannot complete, so RPC remains blocked indefinitely.

### Required fix

- Make `sendPairingCode` async and `await this.encryptEnvelope(...)`.

## 6) Pairing UX is not integrated into the UI flow

### Where

`packages/web-client/app.js`

- There is no UI element to enter the pairing code.
- `RelayClient.promptForPairingCode()` exists but is never called.

### Impact

- Even after fixing (5), the user has no supported flow to provide the code.

### Required fix

- Add a minimal prompt/button in `app.js` when `requiresPairing` is true, and
  call into an awaited `sendPairingCode`.

## 7) Anti-replay is not persistent across host reconnects

### Where

`packages/a2a-server/src/http/relay.ts`:

- `inboundMaxSeq` and `outboundSeq` reset each `runRelayConnection()`.

### Impact

An attacker relay could:

- force a host reconnect,
- replay old frames starting at `seq=1` again,
- and the host would accept them.

### Required fix

- Persist anti-replay state across reconnect **or** introduce a per-connection
  epoch (nonce) negotiated in handshake and included in AAD/envelope.

---

# Remaining “bulletproof” gaps (even after bug fixes)

1. **No tests added** for relay/host/client handshake, anti-replay, pairing, or
   rate-limits.
2. **Pairing attempt rate limiting** is missing (brute-force resistance).
3. **Pairing success/failure is not communicated to client** (no `EVENT`/`ERROR`
   back to UI).
4. **Streaming over relay is not truly implemented** (there is an `EVENT` type
   in client, but host doesn’t emit streaming events).
5. **Multi-instance routing** (Redis pub/sub) is not implemented.

---

# Final task list (next round)

## P0 (must do)

1. Fix relay connection counting:
   - remove double close handlers;
   - remove manual decrements where not needed;
   - add a regression test.
2. Deduplicate relay per-connection rate limiter (double-counting bytes).
3. Implement host handling for text control messages (`RELAY_STATUS`) to avoid
   warnings and enable policies.
4. Fix client re-handshake on `HOST_CONNECTED` control message (host reconnect
   resilience).
5. Fix `sendPairingCode` async bug and wire pairing UI in `app.js`.
6. Add tests:
   - relay unknown session rejection,
   - host reconnect + client re-handshake,
   - pairing happy-path,
   - anti-replay at least within a connection.

## P1 (should do)

7. Make anti-replay robust across reconnects (epoch/nonce persisted or
   negotiated).
8. Add pairing attempt rate limits and client feedback on pairing outcome.
9. Implement streaming frames (`EVENT`) end-to-end.

## P2 (moat)

10. Multi-instance relay routing (Redis).
11. Expand metrics and structured logs (include rate-limit counters and close
    reasons).
