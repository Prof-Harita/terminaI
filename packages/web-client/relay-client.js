export class RelayClient {
  constructor(relayUrl, sessionId, keyBase64, onMessage, onStatus) {
    this.relayUrl = relayUrl;
    this.sessionId = sessionId;
    this.keyBase64 = keyBase64;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.ws = null;
    this.key = null;
    this.reconnectAttempts = 0;
  }

  async connect() {
    this.onStatus('Connecting to Relay...', 'var(--muted)');

    // Import Key
    this.key = await this.importKey(this.keyBase64);

    const wsUrl = new URL(this.relayUrl);
    wsUrl.searchParams.set('role', 'client');
    wsUrl.searchParams.set('session', this.sessionId);

    this.ws = new WebSocket(wsUrl.toString());

    this.ws.onopen = () => {
      this.reconnectAttempts = 0; // Reset on successful connection
      this.onStatus('Connected to Relay', 'var(--accent)');
      console.log('Relay WebSocket Connected');
    };

    this.ws.onclose = () => {
      this.reconnectAttempts++;
      const delay = Math.min(
        3000 * Math.pow(2, this.reconnectAttempts - 1),
        30000,
      );
      this.onStatus(
        `Relay Disconnected (retry in ${delay / 1000}s)`,
        'var(--danger)',
      );
      setTimeout(() => this.connect(), delay);
    };

    this.ws.onerror = (err) => {
      console.error('Relay Error', err);
      this.onStatus('Relay Error', 'var(--danger)');
    };

    this.ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        const buffer = await event.data.arrayBuffer();
        await this.handleEncryptedMessage(buffer);
      } else {
        // Check for control messages
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'RELAY_STATUS') {
            if (msg.status === 'HOST_CONNECTED') {
              this.onStatus('Ready (Host Connected)', 'var(--accent)');
            } else if (msg.status === 'HOST_DISCONNECTED') {
              this.onStatus('Host Disconnected', 'var(--danger)');
            }
          }
        } catch {
          // Ignore malformed control messages
        }
      }
    };
  }

  async importKey(base64Key) {
    const binaryDerString = atob(base64Key);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }
    return await window.crypto.subtle.importKey(
      'raw',
      binaryDer,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt'],
    );
  }

  async encrypt(data) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      encoded,
    );

    // Pack: IV (12) + Tag (16) + Ciphertext
    // Note: Web Crypto encrypt returns Ciphertext + Tag appended automatically?
    // CHECK: AES-GCM in Web Crypto returns ciphertext concatenated with auth tag.
    // So we just need to prepend IV.

    // Wait, Node.js crypto.createCipheriv does NOT append tag automatically to `final()`,
    // but `getAuthTag()` returns it separate.
    // Web Crypto `encrypt` returns ONE ArrayBuffer containing Ciphertext + Tag.
    // The Tag is usually at the end (standard GCM).
    // My Node.js server implementation was: IV (12) + Tag (16) + Ciphertext.
    // Node.js Decipher expects explicit setAuthTag.
    // If I send Ciphertext+Tag from Browser, Node need to split it.

    // Browser Encrypt -> [Ciphertext | Tag]
    // Browser Send -> [IV | Tag | Ciphertext]

    // Let's adjust Browser format to match Node server expectation:
    // Node expects: IV (12) + Tag (16) + Ciphertext

    // Web Crypto returns [Ciphertext | Tag(16)].
    const ctWithTag = new Uint8Array(ciphertext);
    const tagLength = 16;
    const ctLength = ctWithTag.length - tagLength;

    const tag = ctWithTag.slice(ctLength); // Last 16 bytes
    const actualCt = ctWithTag.slice(0, ctLength);

    const result = new Uint8Array(12 + 16 + actualCt.length);
    result.set(iv, 0);
    result.set(tag, 12);
    result.set(actualCt, 12 + 16);

    return result;
  }

  async decrypt(buffer) {
    // Buffer format: IV (12) + Tag (16) + Ciphertext
    const input = new Uint8Array(buffer);
    const iv = input.slice(0, 12);
    const tag = input.slice(12, 12 + 16);
    const ciphertext = input.slice(12 + 16);

    // Web Crypto Decrypt expects: [Ciphertext | Tag]
    const decryptInput = new Uint8Array(ciphertext.length + tag.length);
    decryptInput.set(ciphertext, 0);
    decryptInput.set(tag, ciphertext.length);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.key,
      decryptInput,
    );

    const text = new TextDecoder().decode(decrypted);
    return JSON.parse(text);
  }

  async handleEncryptedMessage(buffer) {
    try {
      const msg = await this.decrypt(buffer);

      // Treat as SSE event for compatibility
      // The server sends back AgentResponse which is JSON.
      // Current app.js expects SSE events.
      // But the relay tunnel returns the full response object, not a stream of SSE events yet.
      // Wait, the A2A server uses `res.write` for streaming if `command.streaming` is true.
      // My Node.js `relay.ts` accumulates response?
      // NO. `relay.ts` calls `await requestHandler.handle(req)`.
      // `requestHandler.handle` returns the FINAL result (Promise<AgentResponse>).
      // It does NOT stream via that API.
      // The `agentExecutor` supports streaming via EventBus, but `DefaultRequestHandler.handle` assumes a single Request-Response cycle unless handling specific `executeCommand` that streams.
      //
      // The `app.ts` `handleExecuteCommand` handles SSE streaming manually.
      // BUT `requestHandler.handle` (SDK) uses `commandToExecute.execute` which might stream to event bus?
      // `DefaultRequestHandler` just waits for `execute` to finish and returns result.
      //
      // Issue: Streaming over this Relay.
      // If `DefaultRequestHandler` waits for completion, we lose streaming.
      // But for now, let's assume request-response (non-streaming) or that `handle` returns a stream?
      // Checking `config.webRemoteRelayUrl`: Use `connectToRelay`.
      // `relay.ts`: `const response = await requestHandler.handle(requestJson);`
      // This confirms it waits for full response.
      // So for streaming commands (like chat), we might experience delay until full generation is done.
      // This is acceptable for v1 "Cloud Relay" if needed, but not ideal.
      //
      // However, `app.js` `readSse` expects a stream.
      // If we get a single JSON object, we should just fire `handleA2aEvent` once with the result.
      this.onMessage({ result: msg });
    } catch (e) {
      console.error('Decryption failed', e);
    }
  }

  async send(body) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Relay not connected');
    }
    const encrypted = await this.encrypt(body);
    this.ws.send(encrypted);

    // Mock a response object for app.js if needed, or just return basic ok
    // The actual response comes via onmessage async.
    // But app.js `postStream` returns a `response` object that is then passed to `readSse`.
    // We need to bridge this.
    return { ok: true };
  }
}
