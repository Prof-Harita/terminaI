# A2A (Web Remote) Investigation Report

## Executive Summary

This document provides a comprehensive analysis of the A2A (Agent-to-Agent) /
Web Remote architecture used by TerminaI. The investigation covered server-side
implementation, client-side connection logic, authentication flow, CORS
configuration, streaming mechanisms, and identified potential issues that may
affect Desktop app connectivity.

---

## 1. Architecture Overview

### High-Level Flow

```
┌─────────────────┐                ┌──────────────────┐                ┌─────────────────┐
│   Desktop App   │                │   A2A Server     │                │    CLI Agent    │
│  (Tauri/React)  │                │  (Express.js)    │                │                 │
└────────┬────────┘                └────────┬─────────┘                └─────────────────┘
         │                                   │
         │  1. /healthz GET                  │
         │─────────────────────────────────▶│
         │  ◀─── 200 OK ────────────────────│
         │                                   │
         │  2. POST / (message/stream)       │
         │     Headers:                      │
         │     - Authorization: Bearer TOKEN │
         │     - X-Gemini-Nonce: UUID        │
         │     - X-Gemini-Signature: HMAC    │
         │     - Accept: text/event-stream   │
         │─────────────────────────────────▶│
         │                                   │
         │  ◀─── SSE Stream ────────────────│
         │     data: {"jsonrpc":"2.0",...}   │
         │                                   │
         │  3. SSE events (streaming)        │
         │  ◀────────────────────────────────│
         │     - task created                │
         │     - status-update (text)        │
         │     - tool-call-confirmation      │
         │     - final result                │
         └───────────────────────────────────┘
```

### Authentication Flow

```
Token Generation (CLI startup with --web-remote):
1. Check for TERMINAI_WEB_REMOTE_TOKEN env var
2. If --web-remote-rotate-token: generate new token
3. If existing ~/.gemini/web-remote-auth.json: use stored hash
4. Otherwise: generate new token and store hash

Token Storage:
- Location: ~/.gemini/web-remote-auth.json
- Format: Scrypt hash (salt + hash, no plaintext)
- Override: TERMINAI_WEB_REMOTE_AUTH_PATH env var

Token Validation (Server):
1. Extract Bearer token from Authorization header
2. Verify HMAC signature using X-Gemini-Nonce + X-Gemini-Signature
3. Compare scrypt hash against stored state
4. Check expiration (if expiresAt is set)
```

---

## 2. Configuration Summary

### Server Configuration

**Entry Point:**
[`packages/a2a-server/src/http/app.ts`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/app.ts#L195-L401)

| Setting         | Source                                                | Default                       |
| --------------- | ----------------------------------------------------- | ----------------------------- |
| Port            | `CODER_AGENT_PORT` env                                | `0` (random)                  |
| Host            | Passed via `startWebRemoteServer()`                   | `localhost`                   |
| Auth Token      | `TERMINAI_WEB_REMOTE_TOKEN` or file                   | **Required**                  |
| Allowed Origins | `TERMINAI_WEB_REMOTE_ALLOWED_ORIGINS` env or settings | `[]`                          |
| Health Check    | `/healthz`                                            | Status 200, `{"status":"ok"}` |

**Key Endpoints:**

- `GET /healthz` - Health check (bypasses auth)
- `GET /whoami` - Returns workspace info (requires auth)
- `GET /ui` - Serves web client (bypasses auth)
- `POST /` - A2A protocol endpoint (streaming)
- `POST /tasks` - Create task
- `POST /executeCommand` - Execute commands

### CLI Flags

**Web-Remote Flags:**
[`packages/cli/src/config/config.ts`](file:///home/profharita/Code/terminaI/packages/cli/src/config/config.ts#L289-L325)

| Flag                             | Type    | Description                    | Default     |
| -------------------------------- | ------- | ------------------------------ | ----------- |
| `--web-remote`                   | boolean | Enable web-remote server       | `false`     |
| `--web-remote-host`              | string  | Host to bind                   | `localhost` |
| `--web-remote-port`              | number  | Port to bind (0=random)        | `0`         |
| `--web-remote-allowed-origins`   | array   | CORS allowlist                 | `[]`        |
| `--web-remote-token`             | string  | Override token (not persisted) | -           |
| `--web-remote-rotate-token`      | boolean | Rotate token and exit          | `false`     |
| `--i-understand-web-remote-risk` | boolean | Allow non-loopback binding     | `false`     |

**Validation Rules:**

- Cannot use `--web-remote-token` and `--web-remote-rotate-token` together
- Binding to non-loopback host requires `--i-understand-web-remote-risk`

### Desktop Client Settings

**Settings Store:**
[`packages/desktop/src/stores/settingsStore.ts`](file:///home/profharita/Code/terminaI/packages/desktop/src/stores/settingsStore.ts#L60-L66)

| Setting              | Default                  | Description              |
| -------------------- | ------------------------ | ------------------------ |
| `agentUrl`           | `http://127.0.0.1:41242` | A2A server URL           |
| `agentToken`         | `""`                     | Bearer token for auth    |
| `agentWorkspacePath` | `/tmp`                   | Workspace path for agent |

---

## 3. CORS Configuration

**Implementation:**
[`packages/a2a-server/src/http/cors.ts`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/cors.ts)

### Allowed Origins

1. **Self-origin:** Request origin matching server's own `Host` header
2. **Tauri/App origins:** `tauri://` and `app://` protocols automatically
   allowed
3. **Loopback origins:** Any loopback-to-loopback request allowed (different
   ports OK)
4. **Explicit allowlist:** Origins in `TERMINAI_WEB_REMOTE_ALLOWED_ORIGINS`

### CORS Headers

```
Access-Control-Allow-Origin: <origin>
Vary: Origin
Access-Control-Allow-Headers: Authorization, Content-Type, X-Gemini-Nonce, X-Gemini-Signature
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

### Loopback Detection Logic

```typescript
function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  if (hostname === '::1') return true;
  return hostname.startsWith('127.');
}
```

**Potential Issue:** The default Desktop agentUrl is `http://127.0.0.1:41242`,
but if the server binds to `localhost`, the hostname won't match exactly, though
loopback-to-loopback logic should handle it.

---

## 4. Authentication Details

### Token Validation

**Server Side:**
[`packages/a2a-server/src/http/auth.ts`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/auth.ts)

1. **Bearer Token Extraction:**

   ```typescript
   const [scheme, token] = authHeader.split(' ');
   if (scheme?.toLowerCase() !== 'bearer' || !token) {
     return res.status(401).json({ error: 'Unauthorized' });
   }
   ```

2. **Token Verification:**

   ```typescript
   // From env:
   verifyToken: (token: string) => token === envToken;

   // From file:
   verifyToken: (token: string) => verifyRemoteAuthToken(token, state);
   ```

3. **Scrypt Verification:**
   ```typescript
   const salt = Buffer.from(state.tokenSaltB64, 'base64');
   const expectedHash = Buffer.from(state.tokenHashB64, 'base64');
   const actualHash = crypto.scryptSync(token, salt, expectedHash.length);
   return crypto.timingSafeEqual(actualHash, expectedHash);
   ```

### Client Side Authentication

**Implementation:**
[`packages/desktop/src/hooks/useCliProcess.ts`](file:///home/profharita/Code/terminaI/packages/desktop/src/hooks/useCliProcess.ts#L69-L89)

1. **Build Signed Headers:**

   ```typescript
   const nonce = crypto.randomUUID();
   const bodyHash = await sha256Hex(bodyString);
   const payload = [method.toUpperCase(), pathWithQuery, bodyHash, nonce].join(
     '\n',
   );
   const signature = await hmacSha256Hex(token, payload);
   ```

2. **Headers Sent:**
   ```typescript
   {
     Authorization: `Bearer ${token}`,
     'X-Gemini-Nonce': nonce,
     'X-Gemini-Signature': signature,
     'Content-Type': 'application/json',
     Accept: 'text/event-stream'
   }
   ```

**❌ POTENTIAL ISSUE:** The server's auth middleware only validates the Bearer
token. It does NOT validate the HMAC signature (`X-Gemini-Signature`). The HMAC
calculation is happening client-side but **not being verified server-side**.

---

## 5. SSE Streaming

### Server Side

**Implementation:**
[`packages/a2a-server/src/http/app.ts`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/app.ts#L157-L176)

```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

const eventHandler = (event: AgentExecutionEvent) => {
  const jsonRpcResponse = {
    jsonrpc: '2.0',
    id: 'taskId' in event ? event.taskId : (event as Message).messageId,
    result: event,
  };
  res.write(`data: ${JSON.stringify(jsonRpcResponse)}\n\n`);
};
```

✅ **Proper flushing:** The server writes `data: ...\n\n` format correctly.

### Client Side

**Implementation:**
[`packages/desktop/src/utils/sse.ts`](file:///home/profharita/Code/terminaI/packages/desktop/src/utils/sse.ts)

```typescript
export async function readSseStream(
  stream: ReadableStream<Uint8Array>,
  onMessage: (msg: SseMessage) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    for (const chunk of splitSseChunks(buffer)) {
      const messages = parseSseDataLines(chunk);
      for (const msg of messages) {
        onMessage(msg);
      }
    }

    // Keep incomplete chunks in buffer
    const lastSeparator = buffer.lastIndexOf('\n\n');
    if (lastSeparator !== -1) {
      buffer = buffer.slice(lastSeparator + 2);
    }
  }
}
```

✅ **Proper buffering:** Handles incomplete chunks correctly.

---

## 6. Error Handling

### Server Error Responses

| Status Code                 | Trigger                      | Response                                 |
| --------------------------- | ---------------------------- | ---------------------------------------- |
| `401 Unauthorized`          | Missing/invalid Bearer token | `{"error":"Unauthorized"}`               |
| `403 Forbidden`             | Origin not allowed (CORS)    | `{"error":"Origin not allowed"}`         |
| `400 Bad Request`           | Invalid command/args         | `{"error":"Invalid \"command\" field."}` |
| `404 Not Found`             | Command not found            | `{"error":"Command not found: ..."}`     |
| `500 Internal Server Error` | Execution error              | `{"error":"<error message>"}`            |

### Client Error Handling

**Connection Check:**
[`packages/desktop/src/hooks/useCliProcess.ts`](file:///home/profharita/Code/terminaI/packages/desktop/src/hooks/useCliProcess.ts#L298-L322)

```typescript
const checkConnection = useCallback(async () => {
  try {
    const health = await fetch(`${baseUrl}/healthz`, { method: 'GET' });
    if (!health.ok) {
      setIsConnected(false);
      return;
    }

    const whoami = await fetch(`${baseUrl}/whoami`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${agentToken.trim()}` },
    });
    setIsConnected(whoami.ok);
  } catch {
    setIsConnected(false);
  }
}, [agentToken, agentUrl]);
```

**Message Send Errors:**

```typescript
catch (error) {
  setIsProcessing(false);
  appendToAssistant(
    `\n[Agent request failed] ${error instanceof Error ? error.message : 'Unknown error'}\n`,
  );
}
```

✅ **Good error messages:** Descriptive enough for debugging.

---

## 7. Potential Issues Found

### Critical Issues

1. **❌ HMAC Signature Not Validated Server-Side**
   - **Location:**
     [`auth.ts`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/auth.ts)
   - **Issue:** Client calculates HMAC signature and sends `X-Gemini-Signature`
     header, but server only validates Bearer token
   - **Impact:** HMAC signature is being computed but never verified, adding
     unnecessary overhead
   - **Fix:** Either remove HMAC calculation client-side OR implement
     server-side validation

2. **⚠️ Replay Protection Disabled**
   - **Location:**
     [`app.ts:37`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/app.ts#L37)
   - **Issue:** `createReplayProtection()` is commented out due to conflict with
     A2A SDK body-parser
   - **Impact:** Requests can be replayed by an attacker who intercepts traffic
   - **Note:** TODO comment exists but not resolved

### Configuration Issues

3. **⚠️ Default Port Mismatch**
   - **Desktop Default:** `http://127.0.0.1:41242`
   - **CLI Default:** Port `0` (random)
   - **Issue:** If user starts web-remote without specifying port, Desktop won't
     connect
   - **Fix:** Either hardcode server default to 41242 OR provide clear
     onboarding

4. **⚠️ Token Not Shown After First Generation**
   - **Location:**
     [`webRemoteServer.ts:96`](file:///home/profharita/Code/terminaI/packages/cli/src/utils/webRemoteServer.ts#L96-L100)
   - **Issue:** After initial token generation, subsequent runs show warning
     that token is hashed
   - **Impact:** User can't retrieve token for Desktop app connection
   - **Workaround:** Use `--web-remote-rotate-token` to generate new token

### CORS Issues

5. **✅ Tauri Origin Supported**
   - **Location:**
     [`cors.ts:38-44`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/cors.ts#L38-L44)
   - **Status:** `tauri://` and `app://` protocols are correctly allowed
   - **No Issue:** Desktop app should work if token is correct

6. **⚠️ Origin Header Required**
   - **Location:**
     [`cors.ts:64-67`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/cors.ts#L64-L67)
   - **Issue:** If no Origin header is present, CORS middleware skips validation
   - **Impact:** Tauri apps might not always send Origin header
   - **Status:** Needs testing to confirm Tauri behavior

---

## 8. Investigation Questions Answered

| Question                                          | Answer                                                         | File/Line                                                                                             |
| ------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Is token validated on every request or just once? | **Every request** - Auth middleware runs on each POST          | [`auth.ts:64-82`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/auth.ts#L64-L82) |
| Does CORS config include Tauri origins?           | **Yes** - `tauri://` and `app://` explicitly allowed           | [`cors.ts:38-44`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/cors.ts#L38-L44) |
| Is SSE properly flushed after each event?         | **Yes** - Writes `data: ...\n\n` format                        | [`app.ts:168`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/app.ts#L168)        |
| Are there any TODO comments related to A2A?       | **Yes** - Replay protection disabled (body streaming conflict) | [`app.ts:37`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/app.ts#L37)          |
| Is there rate limiting that might cause issues?   | **No** - No rate limiting implemented                          | N/A                                                                                                   |
| Are there any obvious security holes?             | **Yes** - Replay protection disabled, HMAC not validated       | See Issue #1, #2                                                                                      |

---

## 9. Recommended Next Steps

### For Debugging Connection Issues

1. **Verify Token Match:**

   ```bash
   # Start CLI with web-remote
   gemini --web-remote --web-remote-port 41242 --web-remote-rotate-token
   # Copy the displayed token to Desktop app settings
   ```

2. **Check Server Logs:**
   - Enable debug mode: `gemini --debug --web-remote`
   - Look for auth failures in console output

3. **Test with cURL:**

   ```bash
   # Health check (no auth)
   curl http://localhost:41242/healthz

   # Whoami (with auth)
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:41242/whoami
   ```

4. **Verify Desktop Settings:**
   - Ensure `agentUrl` matches server (e.g., `http://127.0.0.1:41242`)
   - Ensure `agentToken` is the plaintext token (not hash)
   - Try both `127.0.0.1` and `localhost`

5. **Check Tauri Origin:**
   - Open Desktop app DevTools (if available)
   - Check Network tab for Origin header value
   - Verify it's `tauri://localhost` or similar

### For Future Improvements

1. **Implement HMAC Validation Server-Side**
   - If HMAC is desired, implement validation in auth middleware
   - Otherwise, remove HMAC calculation client-side to reduce overhead

2. **Re-enable Replay Protection**
   - Investigate body streaming conflict
   - Consider alternative nonce-based replay protection

3. **Improve Token Management**
   - Provide QR code or copy-to-clipboard for token
   - Add "Reveal Token" command (with warning)

4. **Standardize Default Port**
   - Either document port 41242 as default
   - Or auto-discover port via mDNS/Bonjour

---

## 10. Code References

### Key Files

- **Server Entry:**
  [`packages/a2a-server/src/http/app.ts`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/app.ts)
- **Server Startup:**
  [`packages/a2a-server/src/http/server.ts`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/server.ts)
- **Auth Middleware:**
  [`packages/a2a-server/src/http/auth.ts`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/auth.ts)
- **CORS Middleware:**
  [`packages/a2a-server/src/http/cors.ts`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/http/cors.ts)
- **Auth Storage:**
  [`packages/a2a-server/src/persistence/remoteAuthStore.ts`](file:///home/profharita/Code/terminaI/packages/a2a-server/src/persistence/remoteAuthStore.ts)
- **CLI Web Remote:**
  [`packages/cli/src/utils/webRemoteServer.ts`](file:///home/profharita/Code/terminaI/packages/cli/src/utils/webRemoteServer.ts)
- **CLI Config:**
  [`packages/cli/src/config/config.ts`](file:///home/profharita/Code/terminaI/packages/cli/src/config/config.ts#L289-L395)
- **Desktop Client:**
  [`packages/desktop/src/hooks/useCliProcess.ts`](file:///home/profharita/Code/terminaI/packages/desktop/src/hooks/useCliProcess.ts)
- **Desktop Settings:**
  [`packages/desktop/src/stores/settingsStore.ts`](file:///home/profharita/Code/terminaI/packages/desktop/src/stores/settingsStore.ts)
- **SSE Utility:**
  [`packages/desktop/src/utils/sse.ts`](file:///home/profharita/Code/terminaI/packages/desktop/src/utils/sse.ts)

---

## Appendix: Token Flow Diagram

```
┌────────────────────────────────────────────────────────────┐
│  CLI Startup with --web-remote                             │
└────────────┬───────────────────────────────────────────────┘
             │
             ├─▶ Check for --web-remote-token flag
             │   └─▶ YES: Use provided token (not persisted)
             │       └─▶ Set TERMINAI_WEB_REMOTE_TOKEN env var
             │
             ├─▶ Check for --web-remote-rotate-token flag
             │   └─▶ YES: Generate new token, save hash, display token, EXIT
             │
             ├─▶ Check for TERMINAI_WEB_REMOTE_TOKEN env var
             │   └─▶ YES: Use env token (not persisted)
             │
             ├─▶ Check for existing ~/.gemini/web-remote-auth.json
             │   └─▶ YES: Load hash, display warning (token not available)
             │
             └─▶ ELSE: Generate new token, save hash, display token
                     └─▶ Store in ~/.gemini/web-remote-auth.json
                         {
                           "version": 1,
                           "tokenId": "...",
                           "tokenSaltB64": "...",
                           "tokenHashB64": "...",  ← Scrypt(token, salt)
                           "createdAt": "...",
                           "lastRotatedAt": "...",
                           "expiresAt": null
                         }
```

---

**Report Generated:** 2025-12-24  
**Agent:** Antigravity  
**Task:** A2A Pre-Investigation for Debugging
