export class RelayClient {
  constructor(
    relayUrl,
    sessionId,
    keyBase64,
    onMessage,
    onStatus,
    onPairingRequired,
  ) {
    this.relayUrl = relayUrl;
    this.sessionId = sessionId;
    this.keyBase64 = keyBase64;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.onPairingRequired = onPairingRequired || (() => {}); // Callback when pairing needed
    this.ws = null;
    this.key = null;
    this.reconnectAttempts = 0;
    this.inboundMaxSeq = 0;
    this.outboundSeq = 0;
    this.state = 'WAIT_HELLO'; // 'WAIT_HELLO', 'READY'
    this.protocolVersion = 2; // Default to v2
    this.epoch = null; // Set by HELLO_ACK for v2
    this.requiresPairing = false; // Exposed for UI
    this.pairingComplete = false;
  }

  async sendHello() {
    // Request both v1 and v2, server will pick highest mutual
    const helloEnvelope = {
      v: 2,
      type: 'HELLO',
      dir: 'c2h',
      seq: ++this.outboundSeq,
      ts: Date.now(),
      payload: { clientId: this.sessionId, protocols: [1, 2] },
    };
    const encrypted = await this.encryptEnvelope(helloEnvelope);
    this.ws.send(encrypted);
  }

  resetForRehandshake() {
    this.state = 'WAIT_HELLO';
    this.inboundMaxSeq = 0;
    this.outboundSeq = 0;
    this.epoch = null;
    this.pairingComplete = false;
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
      this.resetForRehandshake();
      this.onStatus('Handshaking with Relay...', 'var(--muted)');
      console.log(
        JSON.stringify({ event: 'client_ws_connected', timestamp: Date.now() }),
      );
      this.sendHello();
    };

    this.ws.onclose = () => {
      this.reconnectAttempts++;
      const delay = Math.min(
        3000 * Math.pow(2, this.reconnectAttempts - 1),
        30000,
      );
      console.log(
        JSON.stringify({
          event: 'client_ws_disconnected',
          retryDelay: delay,
          timestamp: Date.now(),
        }),
      );
      this.onStatus(
        `Relay Disconnected (retry in ${delay / 1000}s)`,
        'var(--danger)',
      );
      setTimeout(() => this.connect(), delay);
    };

    this.ws.onerror = (err) => {
      console.error(
        JSON.stringify({
          event: 'client_ws_error',
          error: err.message || 'unknown',
          timestamp: Date.now(),
        }),
      );
      this.onStatus('Relay Error', 'var(--danger)');
    };

    this.ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        const buffer = await event.data.arrayBuffer();
        await this.handleEncryptedMessage(buffer);
      } else {
        // Check for control messages (unencrypted JSON from relay)
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'RELAY_STATUS') {
            if (msg.status === 'HOST_CONNECTED') {
              // Host (re)connected - reset state and re-handshake
              console.log(
                JSON.stringify({
                  event: 'host_reconnected_rehandshake',
                  timestamp: Date.now(),
                }),
              );
              this.resetForRehandshake();
              this.onStatus(
                'Host reconnected, re-handshaking...',
                'var(--muted)',
              );
              this.sendHello();
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

  buildAad(dir) {
    if (this.protocolVersion === 2 && this.epoch) {
      return `terminai-relay|v=2|session=${this.sessionId}|epoch=${this.epoch}|dir=${dir}`;
    }
    return `terminai-relay|v=1|session=${this.sessionId}|dir=${dir}`;
  }

  async encryptEnvelope(envelope) {
    // For HELLO, use v1 AAD since we don't have epoch yet
    const aad =
      envelope.type === 'HELLO'
        ? `terminai-relay|v=1|session=${this.sessionId}|dir=${envelope.dir}`
        : this.buildAad(envelope.dir);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(envelope));

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(aad) },
      this.key,
      encoded,
    );

    const ctWithTag = new Uint8Array(ciphertext);
    const tagLength = 16;
    const ctLength = ctWithTag.length - tagLength;

    const tag = ctWithTag.slice(ctLength);
    const actualCt = ctWithTag.slice(0, ctLength);

    const result = new Uint8Array(12 + 16 + actualCt.length);
    result.set(iv, 0);
    result.set(tag, 12);
    result.set(actualCt, 12 + 16);

    return result;
  }

  async encrypt(data) {
    const envelope = {
      v: this.protocolVersion,
      type: 'RPC',
      dir: 'c2h',
      seq: ++this.outboundSeq,
      ts: Date.now(),
      epoch: this.protocolVersion === 2 ? this.epoch : undefined,
      payload: data,
    };
    return this.encryptEnvelope(envelope);
  }

  async decryptEnvelope(buffer) {
    const input = new Uint8Array(buffer);
    const iv = input.slice(0, 12);
    const tag = input.slice(12, 12 + 16);
    const ciphertext = input.slice(12 + 16);

    const decryptInput = new Uint8Array(ciphertext.length + tag.length);
    decryptInput.set(ciphertext, 0);
    decryptInput.set(tag, ciphertext.length);

    // Try v2 AAD first (if we have epoch), then v1
    const aadsToTry = [];
    if (this.epoch) {
      aadsToTry.push(this.buildAad('h2c'));
    }
    aadsToTry.push(`terminai-relay|v=1|session=${this.sessionId}|dir=h2c`);

    let lastError;
    for (const aad of aadsToTry) {
      try {
        const decrypted = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv,
            additionalData: new TextEncoder().encode(aad),
          },
          this.key,
          decryptInput,
        );
        const text = new TextDecoder().decode(decrypted);
        return JSON.parse(text);
      } catch (e) {
        lastError = e;
        continue;
      }
    }
    throw lastError;
  }

  async decrypt(buffer) {
    return this.decryptEnvelope(buffer);
  }

  async handleEncryptedMessage(buffer) {
    try {
      const envelope = await this.decryptEnvelope(buffer);

      // Validate sequence
      if (envelope.dir !== 'h2c' || envelope.seq !== this.inboundMaxSeq + 1) {
        console.error('Invalid envelope or sequence', {
          expected: this.inboundMaxSeq + 1,
          got: envelope.seq,
        });
        return;
      }
      this.inboundMaxSeq = envelope.seq;

      if (envelope.type === 'HELLO_ACK') {
        this.state = 'READY';
        this.protocolVersion = envelope.payload.selectedVersion || 1;
        if (envelope.payload.epoch) {
          this.epoch = envelope.payload.epoch;
        }

        // Check if pairing required
        if (envelope.payload.requiresPairing && !this.pairingComplete) {
          this.requiresPairing = true;
          this.onStatus('Pairing Required', 'var(--warning)');
          this.onPairingRequired(); // Trigger UI callback
        } else {
          this.onStatus('Ready (Handshake Complete)', 'var(--accent)');
        }
      } else if (envelope.type === 'PAIR_ACK') {
        this.pairingComplete = true;
        this.requiresPairing = false;
        this.onStatus('Paired Successfully', 'var(--accent)');
      } else if (envelope.type === 'RPC') {
        this.onMessage({ result: envelope.payload });
      } else if (envelope.type === 'EVENT') {
        this.onMessage(envelope.payload);
      } else if (envelope.type === 'ERROR') {
        console.error(
          JSON.stringify({
            event: 'client_relay_error',
            error: envelope.payload,
            timestamp: Date.now(),
          }),
        );
        const msg = envelope.payload?.message || 'Relay Error';
        this.onStatus(msg, 'var(--danger)');
      }
    } catch (e) {
      console.error(
        JSON.stringify({
          event: 'client_decrypt_error',
          error: e.message,
          timestamp: Date.now(),
        }),
      );
    }
  }

  async send(body) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Relay not connected');
    }
    if (this.state !== 'READY') {
      throw new Error('Handshake not complete');
    }
    const encrypted = await this.encrypt(body);
    this.ws.send(encrypted);

    return { ok: true };
  }

  async sendPairingCode(code) {
    const pairEnvelope = {
      v: this.protocolVersion,
      type: 'PAIR',
      dir: 'c2h',
      seq: ++this.outboundSeq,
      ts: Date.now(),
      epoch: this.protocolVersion === 2 ? this.epoch : undefined,
      payload: { code },
    };
    const encrypted = await this.encryptEnvelope(pairEnvelope);
    this.ws.send(encrypted);
  }
}
